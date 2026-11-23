use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};

fn native_update(app: &tauri::AppHandle, data: &serde_json::Value) -> tauri::Result<()> {
    let menu = Menu::new(app)?;
    for (id, label) in [("show", "Open omp."), ("settings", "Settings")] {
        menu.append(&MenuItem::with_id(app, id, label, true, None::<&str>)?)?;
    }
    for (key, heading) in [("running", "Running sessions"), ("recent", "Recent chats")] {
        menu.append(&MenuItem::with_id(
            app,
            format!("heading-{key}"),
            heading,
            false,
            None::<&str>,
        )?)?;
        if let Some(rows) = data[key].as_array() {
            for row in rows.iter().take(20) {
                let id = format!("chat:{}", row);
                let label = row["name"]
                    .as_str()
                    .unwrap_or("Untitled session")
                    .replace('&', "&&");
                menu.append(&MenuItem::with_id(app, id, label, true, None::<&str>)?)?;
            }
            if rows.is_empty() {
                menu.append(&MenuItem::with_id(
                    app,
                    format!("empty-{key}"),
                    "None",
                    false,
                    None::<&str>,
                )?)?;
            }
        }
    }
    menu.append(&MenuItem::with_id(
        app,
        "quit",
        "Quit omp.…",
        true,
        None::<&str>,
    )?)?;
    if let Some(tray) = app.tray_by_id("omp") {
        tray.set_menu(Some(menu))?;
    } else {
        let pixels = crate::native_icon::pixels("#bfcbd4").expect("valid accent");
        TrayIconBuilder::with_id("omp").icon(tauri::image::Image::new_owned(pixels,64,64))
            .tooltip("omp.").menu(&menu).on_menu_event(|app,event| {
                if let Some(window)=app.get_webview_window("main") {
                    let _=window.show();let _=window.unminimize();let _=window.set_focus();
                    let id=event.id.as_ref();
                    if id=="quit" {let _=window.close();}
                    else if id=="settings" {let _=window.eval("window.dispatchEvent(new CustomEvent('omp:tray-action',{detail:{action:'settings'}}));");}
                    else if let Some(json)=id.strip_prefix("chat:") {
                        if let Ok(session)=serde_json::from_str::<serde_json::Value>(json) {
                            let detail=serde_json::json!({"action":"chat","session":session});
                            let _=window.eval(format!("window.dispatchEvent(new CustomEvent('omp:tray-action',{{detail:{detail}}}));"));
                        }
                    }
                }
            }).build(app)?;
    }
    Ok(())
}

use std::sync::{
    atomic::{AtomicBool, Ordering},
    Mutex,
};
use tauri::{PhysicalPosition, WebviewUrl, WebviewWindowBuilder};

const POPUP_WIDTH: f64 = 272.0;
const POPUP_HEIGHT: f64 = 288.0;

#[derive(Default)]
struct PopupState {
    ready: AtomicBool,
    anchor: Mutex<Option<PhysicalPosition<f64>>>,
    blurred_at: Mutex<Option<std::time::Instant>>,
}

pub fn prepare(app: &tauri::AppHandle, url: &str) -> tauri::Result<()> {
    if cfg!(target_os = "linux") {
        return Ok(());
    }
    app.manage(PopupState::default());
    let origin: tauri::Url = url.parse().expect("validated backend URL");
    let window = WebviewWindowBuilder::new(app, "tray", WebviewUrl::External(origin.clone()))
        .title("omp. tray")
        .decorations(false)
        .shadow(true)
        .visible(false)
        .focused(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .inner_size(POPUP_WIDTH, POPUP_HEIGHT)
        .initialization_script("window.__OMP_DESKTOP__=true;window.__OMP_TRAY__=true;")
        .on_navigation(move |url| url.origin() == origin.origin())
        .on_new_window(|_, _| tauri::webview::NewWindowResponse::Deny)
        .build()?;
    crate::window_frame::apply(&window);
    let popup = window.clone();
    window.on_window_event(move |event| {
        if matches!(event, tauri::WindowEvent::Focused(false)) {
            *popup
                .app_handle()
                .state::<PopupState>()
                .blurred_at
                .lock()
                .unwrap() = Some(std::time::Instant::now());
            let _ = popup.hide();
        }
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            let _ = popup.hide();
        }
    });
    Ok(())
}

// Physical coordinates: keep the whole popup inside the work area on mixed-DPI screens.
fn popup_position(
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    area: (f64, f64, f64, f64),
) -> (i32, i32) {
    let (left, top, right, bottom) = area;
    let below = if y < (top + bottom) / 2.0 {
        y + 10.0
    } else {
        y - height - 10.0
    };
    (
        (x - width / 2.0).clamp(left, (right - width).max(left)) as i32,
        below.clamp(top, (bottom - height).max(top)) as i32,
    )
}
fn show_popup(app: &tauri::AppHandle) {
    let state = app.state::<PopupState>();
    if !state.ready.load(Ordering::SeqCst) {
        return;
    }
    let Some(point) = state.anchor.lock().unwrap().take() else {
        return;
    };
    let Some(window) = app.get_webview_window("tray") else {
        return;
    };
    if let Ok(Some(monitor)) = app.monitor_from_point(point.x, point.y) {
        let area = monitor.work_area();
        let scale = monitor.scale_factor();
        let width = (POPUP_WIDTH * scale).min(area.size.width as f64);
        let height = (POPUP_HEIGHT * scale).min(area.size.height as f64);
        let _ = window.set_size(tauri::PhysicalSize::new(width as u32, height as u32));
        let (x, y) = popup_position(
            point.x,
            point.y,
            width,
            height,
            (
                area.position.x as f64,
                area.position.y as f64,
                (area.position.x as f64) + area.size.width as f64,
                (area.position.y as f64) + area.size.height as f64,
            ),
        );
        let _ = window.set_position(PhysicalPosition::new(x, y));
    }
    let _ = window.eval("window.dispatchEvent(new Event('omp:tray-open'));");
    let _ = window.show();
    let _ = window.set_focus();
}
pub fn update(app: &tauri::AppHandle, data: &serde_json::Value) -> tauri::Result<()> {
    // Linux indicator protocols do not emit tray click events; retain their native menu.
    if cfg!(target_os = "linux") {
        return native_update(app, data);
    }
    if app.tray_by_id("omp").is_none() {
        let pixels = crate::native_icon::pixels("#bfcbd4").expect("valid accent");
        TrayIconBuilder::with_id("omp")
            .icon(tauri::image::Image::new_owned(pixels, 64, 64))
            .tooltip("omp.")
            .show_menu_on_left_click(false)
            .on_tray_icon_event(|tray, event| {
                use tauri::tray::{MouseButtonState, TrayIconEvent};
                if let TrayIconEvent::Click {
                    position,
                    button_state: MouseButtonState::Up,
                    ..
                } = event
                {
                    let app = tray.app_handle();
                    if let Some(window) = app.get_webview_window("tray") {
                        // Clicking the icon can blur/hide the popup before its click event arrives.
                        // Treat that same click as dismissal instead of immediately reopening it.
                        if app
                            .state::<PopupState>()
                            .blurred_at
                            .lock()
                            .unwrap()
                            .is_some_and(|time| {
                                time.elapsed() < std::time::Duration::from_millis(180)
                            })
                        {
                            return;
                        }
                        if window.is_visible().unwrap_or(false) {
                            let _ = window.hide();
                        } else {
                            *app.state::<PopupState>().anchor.lock().unwrap() = Some(position);
                            show_popup(app);
                        }
                    }
                }
            })
            .build(app)?;
    }
    Ok(())
}
pub fn action(app: &tauri::AppHandle, value: serde_json::Value) {
    let action = value["action"].as_str().unwrap_or("");
    if action == "ready" {
        if let Some(state) = app.try_state::<PopupState>() {
            state.ready.store(true, Ordering::SeqCst);
            show_popup(app);
        }
        return;
    }
    if let Some(popup) = app.get_webview_window("tray") {
        let _ = popup.hide();
    }
    if action == "dismiss" {
        return;
    }
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
        if action == "quit" {
            let _ = window.close();
        } else if action == "settings" || action == "chat" {
            let detail = if action == "settings" {
                serde_json::json!({"action":"settings"})
            } else {
                serde_json::json!({"action":"chat","session":value["session"]})
            };
            let _ = window.eval(format!(
                "window.dispatchEvent(new CustomEvent('omp:tray-action',{{detail:{detail}}}));"
            ));
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn popup_stays_inside_negative_and_scaled_monitor_work_areas() {
        assert_eq!(
            popup_position(
                1910.0,
                1070.0,
                POPUP_WIDTH,
                POPUP_HEIGHT,
                (0.0, 0.0, 1920.0, 1040.0),
            ),
            (1648, 752)
        );
        assert_eq!(
            popup_position(
                -1900.0,
                20.0,
                POPUP_WIDTH * 2.0,
                POPUP_HEIGHT * 2.0,
                (-1920.0, 0.0, 0.0, 1080.0),
            ),
            (-1920, 30)
        );
    }
}
