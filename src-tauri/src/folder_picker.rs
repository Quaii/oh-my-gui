use std::io::Write;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

pub fn open(app: &tauri::AppHandle, value: serde_json::Value) {
    let Some(id) = value["id"].as_str().map(str::to_owned) else {
        return;
    };
    let mut picker = app.dialog().file().set_title("Choose a project folder");
    if let Some(window) = app.get_webview_window("main") {
        picker = picker.set_parent(&window);
    }
    if let Some(directory) = value["directory"].as_str() {
        if std::path::Path::new(directory).is_dir() {
            picker = picker.set_directory(directory);
        }
    }
    let handle = app.clone();
    picker.pick_folder(move |selected| {
        let path = selected
            .and_then(|file| file.into_path().ok())
            .map(|path| path.to_string_lossy().to_string());
        let data = serde_json::json!({"id":id,"path":path});
        if let Ok(mut child) = handle.state::<crate::Backend>().child.lock() {
            if let Some(input) = child.stdin.as_mut() {
                let _ = writeln!(input, "folder {data}");
            }
        }
    });
}
