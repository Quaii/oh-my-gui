use std::{fs, io::Write, path::Path};

use serde_json::{json, Value};
use tauri::{AppHandle, Manager};

fn set_enabled(path: &Path, enabled: bool) -> std::io::Result<()> {
    if enabled {
        if let Some(directory) = path.parent() {
            fs::create_dir_all(directory)?;
        }
        fs::File::create(path)?;
    } else if let Err(error) = fs::remove_file(path) {
        if error.kind() != std::io::ErrorKind::NotFound {
            return Err(error);
        }
    }
    Ok(())
}

fn reply(app: &AppHandle, data: Value) {
    if let Ok(mut child) = app.state::<crate::Backend>().child.lock() {
        if let Some(input) = child.stdin.as_mut() {
            let _ = writeln!(input, "notification {data}");
        }
    }
}

pub fn dispatch(app: &AppHandle, value: Value) {
    let Ok(path) = app
        .path()
        .app_data_dir()
        .map(|dir| dir.join("agent-notifications"))
    else {
        if let Some(id) = value["id"].as_str() {
            reply(
                app,
                json!({ "id": id, "error": "Could not locate desktop preferences." }),
            );
        }
        return;
    };
    if let Some(id) = value["id"].as_str().map(str::to_owned) {
        let enabled = value["enabled"].as_bool();
        let handle = app.clone();
        platform::permission(enabled == Some(true), move |permission| {
            if let Some(enabled) = enabled {
                if (!enabled || permission == "granted") && set_enabled(&path, enabled).is_err() {
                    reply(
                        &handle,
                        json!({ "id": id, "error": "Could not save notification preferences." }),
                    );
                    return;
                }
            }
            reply(
                &handle,
                json!({
                    "id": id,
                    "enabled": path.is_file() && permission == "granted",
                    "permission": permission,
                }),
            );
        });
        return;
    }

    let body = match value["kind"].as_str() {
        Some("turn-complete") => "The agent finished a turn.",
        Some("question") => "The agent has a question for you.",
        _ => return,
    };
    let focused = app.get_webview_window("main").is_some_and(|window| {
        window.is_visible().unwrap_or(false)
            && !window.is_minimized().unwrap_or(false)
            && window.is_focused().unwrap_or(false)
    });
    if path.is_file() && (!focused || value["backgroundChat"] == true) {
        platform::show(app, body);
    }
}

#[cfg(not(target_os = "macos"))]
mod platform {
    use super::AppHandle;
    use tauri_plugin_notification::NotificationExt;

    pub fn permission(_request: bool, done: impl FnOnce(&'static str)) {
        done("granted");
    }

    pub fn show(app: &AppHandle, body: &str) {
        if let Err(error) = app
            .notification()
            .builder()
            .title("Oh My GUI")
            .body(body)
            .show()
        {
            eprintln!("Could not send desktop notification: {error}");
        }
    }
}

#[cfg(target_os = "macos")]
mod platform {
    use super::AppHandle;
    use block2::RcBlock;
    use objc2::runtime::Bool;
    use objc2_foundation::{NSBundle, NSString};
    use objc2_user_notifications::{
        UNAuthorizationOptions, UNAuthorizationStatus, UNMutableNotificationContent,
        UNNotificationRequest, UNUserNotificationCenter,
    };

    pub fn permission(request: bool, done: impl Fn(&'static str) + 'static) {
        if NSBundle::mainBundle().bundleIdentifier().is_none() {
            done("unavailable");
            return;
        }
        let center = UNUserNotificationCenter::currentNotificationCenter();
        if request {
            let callback = RcBlock::new(
                move |allowed: Bool, error: *mut objc2_foundation::NSError| {
                    done(if !error.is_null() {
                        "unavailable"
                    } else if allowed.as_bool() {
                        "granted"
                    } else {
                        "denied"
                    });
                },
            );
            center.requestAuthorizationWithOptions_completionHandler(
                UNAuthorizationOptions::Alert,
                &callback,
            );
        } else {
            let callback = RcBlock::new(
                move |settings: std::ptr::NonNull<
                    objc2_user_notifications::UNNotificationSettings,
                >| {
                    let status = unsafe { settings.as_ref() }.authorizationStatus();
                    done(match status {
                        UNAuthorizationStatus::Authorized | UNAuthorizationStatus::Provisional => {
                            "granted"
                        }
                        UNAuthorizationStatus::NotDetermined => "prompt",
                        _ => "denied",
                    });
                },
            );
            center.getNotificationSettingsWithCompletionHandler(&callback);
        }
    }

    pub fn show(_app: &AppHandle, body: &'static str) {
        permission(false, move |permission| {
            if permission != "granted" {
                return;
            }
            let content = UNMutableNotificationContent::new();
            content.setTitle(&NSString::from_str("Oh My GUI"));
            content.setBody(&NSString::from_str(body));
            let id = NSString::from_str(&uuid::Uuid::new_v4().to_string());
            let request =
                UNNotificationRequest::requestWithIdentifier_content_trigger(&id, &content, None);
            UNUserNotificationCenter::currentNotificationCenter()
                .addNotificationRequest_withCompletionHandler(&request, None);
        });
    }
}
