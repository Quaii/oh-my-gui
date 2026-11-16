/// Keep the actual OS frame rounded, including the opaque WebView at its edges.
/// DWM owns maximized/snapped geometry; older Windows versions may ignore these hints.
pub fn apply(window: &tauri::WebviewWindow) {
    #[cfg(windows)]
    if let Ok(handle) = window.hwnd() {
        use windows_sys::Win32::Graphics::Dwm::{
            DwmSetWindowAttribute, DWMWA_BORDER_COLOR, DWMWA_WINDOW_CORNER_PREFERENCE, DWMWCP_ROUND,
        };
        let corners = DWMWCP_ROUND;
        // Retain the native shadow without Tauri's light border around dark custom chrome.
        let border: u32 = 0xfffffffe; // DWMWA_COLOR_NONE
        unsafe {
            let _ = DwmSetWindowAttribute(
                handle.0,
                DWMWA_WINDOW_CORNER_PREFERENCE as u32,
                std::ptr::from_ref(&corners).cast(),
                std::mem::size_of_val(&corners) as u32,
            );
            let _ = DwmSetWindowAttribute(
                handle.0,
                DWMWA_BORDER_COLOR as u32,
                (&border as *const u32).cast(),
                std::mem::size_of_val(&border) as u32,
            );
        }
    }
    #[cfg(not(windows))]
    let _ = window;
}
