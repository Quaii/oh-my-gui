use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};

pub fn update(app: &tauri::AppHandle, data: &serde_json::Value) -> tauri::Result<()> {
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
            for row in rows.iter().take(if key == "recent" { 5 } else { 20 }) {
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
