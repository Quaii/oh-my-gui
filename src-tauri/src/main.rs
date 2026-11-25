#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod backend_path;
mod folder_picker;
#[cfg(windows)]
mod installer_shutdown;
mod native_icon;
mod notifications;
mod tray;
mod updates;
mod window_frame;

use std::{
    io::{BufRead, BufReader, Write},
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc, Mutex,
    },
    thread,
    time::{Duration, Instant},
};
use tauri::{webview::NewWindowResponse, Manager, WebviewUrl, WebviewWindowBuilder};

struct Backend {
    child: Mutex<Child>,
}
struct InstallerBusy(AtomicBool);
struct InstallerCloseAllowed(AtomicBool);
struct WindowMode(Mutex<Option<String>>);
impl Backend {
    fn stop(&self) {
        let Ok(mut child) = self.child.lock() else {
            return;
        };
        if child.try_wait().ok().flatten().is_some() {
            return;
        }
        if let Some(mut input) = child.stdin.take() {
            let _ = input.write_all(b"shutdown\n");
        }
        let deadline = Instant::now() + Duration::from_secs(6);
        while Instant::now() < deadline {
            if child.try_wait().ok().flatten().is_some() {
                return;
            }
            thread::sleep(Duration::from_millis(50));
        }
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            let _ = Command::new("taskkill")
                .args(["/PID", &child.id().to_string(), "/T", "/F"])
                .creation_flags(0x08000000)
                .status();
        }
        let _ = child.kill();
        let _ = child.wait();
    }
}
impl Drop for Backend {
    fn drop(&mut self) {
        self.stop();
    }
}

fn clear_installer_environment(command: &mut Command) {
    command
        .env_remove("OMP_INSTALLER_PAYLOAD")
        .env_remove("OMP_INSTALL_PROGRESS");
}

fn start_backend(
    app: &tauri::AppHandle,
    installer: bool,
) -> Result<(Backend, String), Box<dyn std::error::Error>> {
    let runtime: PathBuf = if cfg!(debug_assertions) {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("resources/runtime")
    } else {
        let relative = if cfg!(target_os = "macos") { "resources/runtime" } else { "runtime" };
        app.path().resource_dir()?.join(relative)
    };
    let runtime = backend_path::for_child(&runtime);
    let token = uuid::Uuid::new_v4().simple().to_string();
    let port: u64 = if installer { 4320 } else { 4319 };
    let node = if cfg!(all(target_os = "macos", not(debug_assertions))) {
        std::env::current_exe()?.with_file_name("node")
    } else {
        runtime.join(if cfg!(windows) { "node.exe" } else { "node" })
    };
    let mut command = Command::new(node);
    command
        .arg(runtime.join("server/src/index.mjs"))
        .current_dir(backend_path::for_child(&app.path().home_dir()?))
        .env("HOST", "127.0.0.1")
        .env("PORT", port.to_string())
        .env("OMP_DESKTOP_TOKEN", &token)
        .env("OMP_APP_VERSION", env!("CARGO_PKG_VERSION"))
        .env(
            "OMP_UPDATES_CONFIGURED",
            if updates::configured() && !installer {
                "true"
            } else {
                "false"
            },
        )
        .env(
            "OMP_DESKTOP_DATA",
            backend_path::for_child(&app.path().app_data_dir()?),
        )
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit());
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    {
        // Desktop launchers may omit shell startup paths. Preserve PATH order.
        let path = std::env::var_os("PATH").unwrap_or_default();
        let home = app.path().home_dir()?;
        let mut extra = vec![
            home.join(".bun/bin"),
            PathBuf::from("/usr/local/bin"),
        ];
        #[cfg(target_os = "macos")]
        extra.insert(1, PathBuf::from("/opt/homebrew/bin"));
        #[cfg(target_os = "linux")]
        extra.extend([
            home.join(".local/bin"),
            PathBuf::from("/home/linuxbrew/.linuxbrew/bin"),
            home.join(".linuxbrew/bin"),
        ]);
        command.env(
            "PATH",
            std::env::join_paths(std::env::split_paths(&path).chain(extra))?,
        );
    }
    // Normal launches may originate from an older installer; enforce mode here too.
    clear_installer_environment(&mut command);
    if installer {
        command.env(
            "OMP_INSTALLER_PAYLOAD",
            backend_path::for_child(&std::env::current_exe()?)
                .parent()
                .ok_or("Missing installer directory")?
                .join("install-payload.exe"),
        );
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    let mut child = command.spawn()?;
    let stdout = child.stdout.take().ok_or("Missing backend output")?;
    let backend = Backend {
        child: Mutex::new(child),
    };
    let (send, receive) = mpsc::channel();
    let native_app = app.clone();
    thread::spawn(move || {
        for line in BufReader::new(stdout).lines().map_while(Result::ok) {
            if let Some(data) = line.strip_prefix("OMP_DESKTOP_READY ") {
                if serde_json::from_str::<serde_json::Value>(data)
                    .ok()
                    .and_then(|v| v["port"].as_u64())
                    == Some(port)
                {
                    let _ = send.send(());
                }
            } else if let Some(data) = line.strip_prefix("OMP_DESKTOP_INSTALLING ") {
                native_app
                    .state::<InstallerBusy>()
                    .0
                    .store(data == "true", Ordering::SeqCst);
            } else if let Some(data) = line.strip_prefix("OMP_DESKTOP_WINDOW ") {
                if let Ok(value) = serde_json::from_str::<serde_json::Value>(data) {
                    if let Some(window) = native_app.get_webview_window("main") {
                        match value["action"].as_str() {
                            Some("ready") => {
                                let mode = if installer {
                                    "installer"
                                } else if value["mode"] == "setup" {
                                    "setup"
                                } else {
                                    "workspace"
                                };
                                let display_window = window.clone();
                                let _ = window.run_on_main_thread(move || {
                                    if let Err(error) = reveal_window(&display_window, mode) {
                                        startup_error(&format!(
                                            "The window could not open: {error}"
                                        ));
                                        display_window.app_handle().exit(1);
                                    }
                                });
                            }
                            Some("hide") => {
                                let _ = window.hide();
                            }
                            Some("drag") => {
                                let _ = window.start_dragging();
                            }
                            Some("minimize") => {
                                let _ = window.minimize();
                            }
                            Some("toggle-maximize") => {
                                if window.is_maximized().unwrap_or(false) {
                                    let _ = window.unmaximize();
                                } else {
                                    let _ = window.maximize();
                                }
                                sync_window_state(&window);
                            }
                            Some("close") => {
                                let _ = window.close();
                            }
                            Some("close-confirmed")
                                if !native_app
                                    .state::<InstallerBusy>()
                                    .0
                                    .load(Ordering::SeqCst) =>
                            {
                                native_app
                                    .state::<InstallerCloseAllowed>()
                                    .0
                                    .store(true, Ordering::SeqCst);
                                let _ = window.close();
                            }
                            Some("sync-state") => sync_window_state(&window),
                            _ => {}
                        }
                    }
                }
            } else if let Some(data) = line.strip_prefix("OMP_DESKTOP_FOLDER ") {
                if !installer {
                    if let Ok(value) = serde_json::from_str(data) {
                        folder_picker::open(&native_app, value);
                    }
                }
            } else if let Some(data) = line.strip_prefix("OMP_DESKTOP_NOTIFICATION ") {
                if !installer {
                    if let Ok(value) = serde_json::from_str(data) {
                        let handle = native_app.clone();
                        let _ = native_app.run_on_main_thread(move || notifications::dispatch(&handle, value));
                    }
                }
            } else if let Some(data) = line.strip_prefix("OMP_DESKTOP_TRAY_ACTION ") {
                if !installer {
                    if let Ok(value) = serde_json::from_str(data) {
                        tray::action(&native_app, value);
                    }
                }
            } else if let Some(data) = line.strip_prefix("OMP_DESKTOP_UPDATE ") {
                if !installer && ["check", "download", "install"].contains(&data) {
                    updates::dispatch(native_app.clone(), data);
                }
            } else if let Some(data) = line.strip_prefix("OMP_DESKTOP_TRAY ") {
                if let Ok(value) = serde_json::from_str::<serde_json::Value>(data) {
                    let handle = native_app.clone();
                    let _ = native_app.run_on_main_thread(move || {
                        let _ = tray::update(&handle, &value);
                    });
                }
            } else if let Some(data) = line.strip_prefix("OMP_DESKTOP_APPEARANCE ") {
                if let Ok(value) = serde_json::from_str::<serde_json::Value>(data) {
                    if let Some(bytes) = value["accent"].as_str().and_then(native_icon::pixels) {
                        if let Some(window) = native_app.get_webview_window("main") {
                            let _ = window.set_icon(tauri::image::Image::new_owned(
                                bytes.clone(),
                                64,
                                64,
                            ));
                            if let Some(tray) = native_app.tray_by_id("omp") {
                                let _ = tray
                                    .set_icon(Some(tauri::image::Image::new_owned(bytes, 64, 64)));
                            }
                        }
                    }
                }
            } else {
                println!("{line}");
            }
        }
    });
    receive.recv_timeout(Duration::from_secs(30)).map_err(|_| "The desktop backend could not start. Close the other app or installer instance and try again.")?;
    Ok((
        backend,
        format!("http://127.0.0.1:{port}/desktop/bootstrap?token={token}"),
    ))
}

#[cfg(test)]
mod environment_tests {
    use super::*;
    #[test]
    fn normal_backend_does_not_inherit_installer_mode() {
        let mut command = Command::new("node");
        command
            .env("OMP_INSTALLER_PAYLOAD", "stale-payload")
            .env("OMP_INSTALL_PROGRESS", "stale-log");
        clear_installer_environment(&mut command);
        for key in ["OMP_INSTALLER_PAYLOAD", "OMP_INSTALL_PROGRESS"] {
            assert_eq!(
                command
                    .get_envs()
                    .find(|(name, _)| *name == std::ffi::OsStr::new(key))
                    .map(|(_, value)| value),
                Some(None)
            );
        }
    }
}

fn sync_window_state(window: &tauri::WebviewWindow) {
    if let Ok(maximized) = window.is_maximized() {
        let script=format!("window.dispatchEvent(new CustomEvent('omp:window-state', {{ detail: {{ maximized: {maximized} }} }}));");
        let _ = window.eval(&script);
    }
}

fn external(url: &tauri::Url) {
    if matches!(url.scheme(), "https" | "http") {
        let _ = open::that_detached(url.as_str());
    }
}

fn startup_error(message: &str) {
    eprintln!("{message}");
    #[cfg(windows)]
    unsafe {
        use windows_sys::Win32::UI::WindowsAndMessaging::{MessageBoxW, MB_ICONERROR, MB_OK};
        let text: Vec<u16> = message.encode_utf16().chain(Some(0)).collect();
        let title: Vec<u16> = "Oh My GUI could not start"
            .encode_utf16()
            .chain(Some(0))
            .collect();
        MessageBoxW(
            std::ptr::null_mut(),
            text.as_ptr(),
            title.as_ptr(),
            MB_OK | MB_ICONERROR,
        );
    }
}

fn reveal_window(window: &tauri::WebviewWindow, mode: &str) -> tauri::Result<()> {
    let app = window.app_handle();
    let mode_state = app.state::<WindowMode>();
    let mut current = mode_state.0.lock().unwrap();
    if current.as_deref() != Some(mode) {
        let compact = mode != "workspace";
        window.set_min_size(Some(tauri::LogicalSize::new(
            if compact { 640.0 } else { 900.0 },
            if compact { 440.0 } else { 640.0 },
        )))?;
        window.set_size(tauri::LogicalSize::new(
            if compact { 680.0 } else { 1440.0 },
            if compact { 460.0 } else { 960.0 },
        ))?;
        window.set_resizable(!compact)?;
        window.center()?;
        *current = Some(mode.to_owned());
    }
    window_frame::apply(window);
    window.show()
}

fn setup_window(app: &mut tauri::App, installer: bool) -> Result<(), Box<dyn std::error::Error>> {
    let port = if installer { 4320 } else { 4319 };
    app.manage(InstallerBusy(AtomicBool::new(false)));
    app.manage(InstallerCloseAllowed(AtomicBool::new(false)));
    app.manage(WindowMode(Mutex::new(None)));
    app.manage(updates::Updates::default());
    let (backend, url) = start_backend(app.handle(), installer)?;
    app.manage(backend);
    #[cfg(not(target_os = "linux"))]
    let custom_chrome = cfg!(any(windows, target_os = "macos"));
    #[cfg(target_os = "linux")]
    let custom_chrome = {
        use gtk::prelude::ObjectExt;
        // Wayland window moves need the compositor's pointer grab. Keep its native frame.
        gtk::gdk::Display::default().is_some_and(|display| display.type_().name() == "GdkX11Display")
    };
    let window = WebviewWindowBuilder::new(app, "main", WebviewUrl::External(url.parse()?))
        .title(if installer { "Install Oh My GUI" } else { "Oh My GUI" })
        .decorations(!custom_chrome)
        .shadow(true)
        .visible(false)
        .inner_size(680.0, 460.0)
        .min_inner_size(640.0, 440.0)
        .resizable(!installer)
        .center()
        .disable_drag_drop_handler()
        .initialization_script(if installer {
            "window.__OMP_DESKTOP__=true;window.__OMP_CUSTOM_CHROME__=true;window.__OMP_INSTALLER__=true;"
        } else if custom_chrome {
            "window.__OMP_DESKTOP__=true;window.__OMP_CUSTOM_CHROME__=true;"
        } else {
            "window.__OMP_DESKTOP__=true;"
        })
        .on_navigation(move |url| {
            if url.scheme() == "http"
                && url.host_str() == Some("127.0.0.1")
                && url.port() == Some(port)
            {
                true
            } else {
                external(url);
                false
            }
        })
        .on_new_window(|url, _| {
            external(&url);
            NewWindowResponse::Deny
        })
        .build()?;
    window_frame::apply(&window);
    if !installer {
        tray::prepare(app.handle(), &url)?;
        tray::update(app.handle(), &serde_json::json!({"recent":[],"running":[]}))?;
    }
    let state_window = window.clone();
    window.on_window_event(move |event| {
        if matches!(event, tauri::WindowEvent::Destroyed) {
            state_window.app_handle().exit(0);
        }
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            if !state_window
                .app_handle()
                .state::<InstallerCloseAllowed>()
                .0
                .swap(false, Ordering::SeqCst)
                || state_window
                    .app_handle()
                    .state::<InstallerBusy>()
                    .0
                    .load(Ordering::SeqCst)
            {
                api.prevent_close();
                let _ =
                    state_window.eval("window.dispatchEvent(new Event('omp:close-requested'));");
            }
        }
        if matches!(
            event,
            tauri::WindowEvent::Resized(_) | tauri::WindowEvent::ScaleFactorChanged { .. }
        ) {
            window_frame::apply(&state_window);
            sync_window_state(&state_window);
        }
    });
    let startup_app = app.handle().clone();
    thread::spawn(move || {
        thread::sleep(Duration::from_secs(20));
        if startup_app
            .state::<WindowMode>()
            .0
            .lock()
            .unwrap()
            .is_none()
        {
            let failed_app = startup_app.clone();
            let _ = startup_app.run_on_main_thread(move || {
                startup_error("The interface could not load. Close this copy and run the packaged Oh My GUI installer or app again.");
                failed_app.exit(1);
            });
        }
    });
    Ok(())
}

fn main() {
    #[cfg(windows)]
    if let Some(action @ ("--installer-check-app" | "--installer-close-app")) =
        std::env::args().nth(1).as_deref()
    {
        match installer_shutdown::run(action == "--installer-close-app") {
            Ok(state) => println!("{state}"),
            Err(error) => {
                eprintln!("{error}");
                std::process::exit(1);
            }
        }
        return;
    }
    let installer = cfg!(windows) && std::env::args().any(|argument| argument == "--installer");
    let builder = tauri::Builder::default();
    #[cfg(not(target_os = "macos"))]
    let builder = builder.plugin(tauri_plugin_notification::init());
    let result = builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(move |app| {
            // Setup runs during the event loop, after Builder::build. Handle failures
            // here so the GUI-subsystem installer does not disappear in a Tauri panic.
            let setup_result = setup_window(app, installer);
            if let Err(error) = setup_result {
                startup_error(&error.to_string());
                app.handle().exit(1);
            }
            Ok(())
        })
        .build(tauri::generate_context!());
    let app = match result {
        Ok(app) => app,
        Err(error) => {
            startup_error(&error.to_string());
            return;
        }
    };
    app.run(|app, event| {
        if matches!(event, tauri::RunEvent::Exit) {
            if let Some(backend) = app.try_state::<Backend>() {
                backend.stop();
            }
        }
    });
}
