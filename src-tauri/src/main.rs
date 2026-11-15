#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod native_icon;

use std::{
    io::{BufRead, BufReader, Write},
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::{mpsc, Mutex},
    thread,
    time::{Duration, Instant},
};
use tauri::{webview::NewWindowResponse, Manager, WebviewUrl, WebviewWindowBuilder};

struct Backend {
    child: Mutex<Child>,
}
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

fn start_backend(app: &tauri::AppHandle) -> Result<(Backend, String), Box<dyn std::error::Error>> {
    let runtime: PathBuf = if cfg!(debug_assertions) {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("resources/runtime")
    } else {
        app.path().resource_dir()?.join("runtime")
    };
    let token = uuid::Uuid::new_v4().simple().to_string();
    let mut command = Command::new(runtime.join(if cfg!(windows) { "node.exe" } else { "node" }));
    command
        .arg(runtime.join("server/src/index.mjs"))
        .current_dir(app.path().home_dir()?)
        .env("HOST", "127.0.0.1")
        .env("PORT", "4319")
        .env("OMP_DESKTOP_TOKEN", &token)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit());
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
                    == Some(4319)
                {
                    let _ = send.send(());
                }
            } else if let Some(data) = line.strip_prefix("OMP_DESKTOP_WINDOW ") {
                if let Ok(value) = serde_json::from_str::<serde_json::Value>(data) {
                    if let Some(window) = native_app.get_webview_window("main") {
                        match value["action"].as_str() {
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
                            Some("sync-state") => sync_window_state(&window),
                            _ => {}
                        }
                    }
                }
            } else if let Some(data) = line.strip_prefix("OMP_DESKTOP_APPEARANCE ") {
                if let Ok(value) = serde_json::from_str::<serde_json::Value>(data) {
                    if let Some(bytes) = value["accent"].as_str().and_then(native_icon::pixels) {
                        if let Some(window) = native_app.get_webview_window("main") {
                            let _ = window.set_icon(tauri::image::Image::new_owned(bytes, 64, 64));
                        }
                    }
                }
            } else {
                println!("{line}");
            }
        }
    });
    receive.recv_timeout(Duration::from_secs(30)).map_err(|_| "The desktop backend could not start. Port 4319 may already be in use. Close the other desktop instance and try again.")?;
    Ok((
        backend,
        format!("http://127.0.0.1:4319/desktop/bootstrap?token={token}"),
    ))
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
        let title: Vec<u16> = "omp. could not start"
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

fn main() {
    let result = tauri::Builder::default()
        .setup(|app| {
            let (backend, url) = start_backend(app.handle())?;
            app.manage(backend);
            let window = WebviewWindowBuilder::new(app, "main", WebviewUrl::External(url.parse()?))
                .title("omp.")
                .decorations(!cfg!(windows))
                .inner_size(1440.0, 960.0)
                .min_inner_size(900.0, 640.0)
                .center()
                .disable_drag_drop_handler()
                .initialization_script(if cfg!(windows) {
                    "window.__OMP_DESKTOP__=true;window.__OMP_CUSTOM_CHROME__=true;"
                } else {
                    "window.__OMP_DESKTOP__=true;"
                })
                .on_navigation(|url| {
                    if url.scheme() == "http"
                        && url.host_str() == Some("127.0.0.1")
                        && url.port() == Some(4319)
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
            let state_window = window.clone();
            window.on_window_event(move |event| {
                if matches!(event, tauri::WindowEvent::Resized(_)) {
                    sync_window_state(&state_window);
                }
            });
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
