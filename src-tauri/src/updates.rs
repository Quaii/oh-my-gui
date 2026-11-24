use crate::{Backend, InstallerBusy};
use serde_json::{json, Value};
use std::{
    io::Write,
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    time::Duration,
};
use tauri::Manager;
use tauri_plugin_updater::{Update, UpdaterExt};

#[derive(Default)]
pub struct Updates {
    busy: AtomicBool,
    pending: Mutex<Option<Update>>,
    bytes: Mutex<Option<Vec<u8>>>,
}

fn report(app: &tauri::AppHandle, value: Value) {
    if let Some(backend) = app.try_state::<Backend>() {
        if let Ok(mut child) = backend.child.lock() {
            if let Some(input) = child.stdin.as_mut() {
                let _ = writeln!(input, "update {}", value);
            }
        }
    }
}

fn secure_url(url: &tauri::Url) -> bool {
    url.scheme() == "https" && url.username().is_empty() && url.password().is_none()
}

pub fn configured() -> bool {
    if cfg!(target_os = "linux") && std::env::var_os("APPIMAGE").is_none() {
        return false;
    }
    option_env!("OMP_UPDATE_PUBLIC_KEY").is_some_and(|v| !v.trim().is_empty())
        && option_env!("OMP_UPDATE_ENDPOINT").is_some_and(|v| v.starts_with("https://"))
}

pub fn dispatch(app: tauri::AppHandle, action: &str) {
    let state = app.state::<Updates>();
    if !configured() {
        report(
            &app,
            json!({"phase":"disabled","message":"Updates will be enabled when a signed release channel is configured."}),
        );
        return;
    }
    if state.busy.swap(true, Ordering::SeqCst) {
        report(
            &app,
            json!({"phase":"error","message":"The previous update operation is still finishing. Please check again."}),
        );
        return;
    }
    let action = action.to_owned();
    tauri::async_runtime::spawn(async move {
        if let Err(error) = run(&app, &action).await {
            report(&app, json!({"phase":"error","message":error.to_string()}));
        }
        app.state::<Updates>().busy.store(false, Ordering::SeqCst);
    });
}

async fn run(
    app: &tauri::AppHandle,
    action: &str,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let state = app.state::<Updates>();
    if action == "check" {
        report(
            app,
            json!({"phase":"checking","message":"Checking for updates…"}),
        );
        // Only build-time trusted endpoints/keys. The webview cannot supply an executable URL.
        let endpoint: tauri::Url = option_env!("OMP_UPDATE_ENDPOINT").unwrap().parse()?;
        if !secure_url(&endpoint) {
            return Err("The release endpoint must use HTTPS without embedded credentials.".into());
        }
        let stop_app = app.clone();
        let update = app
            .updater_builder()
            .pubkey(option_env!("OMP_UPDATE_PUBLIC_KEY").unwrap())
            .endpoints(vec![endpoint])?
            .timeout(Duration::from_secs(120))
            .on_before_exit(move || stop_app.state::<Backend>().stop())
            .build()?
            .check()
            .await?;
        if let Some(update) = update {
            if !secure_url(&update.download_url) {
                return Err(
                    "The update package must use HTTPS without embedded credentials.".into(),
                );
            }
            report(
                app,
                json!({"phase":"available","version":update.version,"notes":update.body,"message":"An update is available."}),
            );
            *state.pending.lock().unwrap() = Some(update);
            *state.bytes.lock().unwrap() = None;
        } else {
            *state.pending.lock().unwrap() = None;
            *state.bytes.lock().unwrap() = None;
            report(
                app,
                json!({"phase":"current","message":"You’re up to date."}),
            );
        }
    } else if action == "download" {
        let update = state
            .pending
            .lock()
            .unwrap()
            .take()
            .ok_or("Check for an update first.")?;
        report(
            app,
            json!({"phase":"downloading","message":"Downloading update…","downloaded":0}),
        );
        let mut downloaded = 0u64;
        let mut last = std::time::Instant::now();
        let result = update.download(|length, total| {
            downloaded += length as u64;
            if last.elapsed() > Duration::from_millis(200) {
                report(app, json!({"phase":"downloading","downloaded":downloaded,"total":total,"message":"Downloading update…"}));
                last = std::time::Instant::now();
            }
        }, || report(app, json!({"phase":"verifying","message":"Verifying update signature…"}))).await;
        *state.pending.lock().unwrap() = Some(update);
        *state.bytes.lock().unwrap() = Some(result?);
        report(
            app,
            json!({"phase":"ready","message":"Update verified. Ready to install and restart."}),
        );
    } else if action == "install" {
        let update = state
            .pending
            .lock()
            .unwrap()
            .take()
            .ok_or("Check for an update first.")?;
        let bytes = state
            .bytes
            .lock()
            .unwrap()
            .take()
            .ok_or("Download and verify the update first.")?;
        app.state::<InstallerBusy>().0.store(true, Ordering::SeqCst);
        report(
            app,
            json!({"phase":"installing","message":"Installing update and restarting…"}),
        );
        // The plugin verifies the signature again and hands off to the platform installer.
        // On Windows, on_before_exit shuts down the owned backend before replacing files.
        if let Err(error) = update.install(bytes) {
            app.state::<InstallerBusy>()
                .0
                .store(false, Ordering::SeqCst);
            #[cfg(windows)]
            if app
                .state::<Backend>()
                .child
                .lock()
                .unwrap()
                .try_wait()
                .ok()
                .flatten()
                .is_some()
            {
                crate::startup_error(&format!(
                    "The update could not start: {error}. Reopening the installed app."
                ));
                app.restart();
            }
            return Err(error.into());
        }
        #[cfg(not(windows))]
        {
            app.state::<Backend>().stop();
            app.restart();
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn update_urls_require_https_without_credentials() {
        assert!(secure_url(
            &"https://github.com/Quaii/oh-my-gui/releases/latest/download/latest.json"
                .parse()
                .unwrap()
        ));
        for invalid in [
            "http://example.com/update",
            "https://user:token@example.com/update",
            "file:///C:/update.exe",
        ] {
            assert!(!secure_url(&invalid.parse().unwrap()));
        }
    }
    #[test]
    fn default_config_keeps_the_native_upgrade_quiet() {
        let value: serde_json::Value =
            serde_json::from_str(include_str!("../tauri.conf.json")).unwrap();
        let config: tauri_plugin_updater::Config =
            serde_json::from_value(value["plugins"]["updater"].clone()).unwrap();
        assert_eq!(config.windows.unwrap().install_mode.to_string(), "quiet");
    }
}
