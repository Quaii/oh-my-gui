/// Ask Windows to composite corners, with a region fallback for older versions.
pub fn apply(window: &tauri::WebviewWindow) {
    #[cfg(windows)]
    if let Ok(handle) = window.hwnd() {
        use windows_sys::Win32::Graphics::Dwm::{
            DwmSetWindowAttribute, DWMWA_BORDER_COLOR, DWMWA_WINDOW_CORNER_PREFERENCE,
            DWMWCP_ROUND,
        };
        let corners = DWMWCP_ROUND;
        let border: u32 = 0xfffffffe; // DWMWA_COLOR_NONE
        let rounds_with_dwm = unsafe {
            let corner_result = DwmSetWindowAttribute(
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
            corner_result >= 0
        };
        if window.label() == "main" && !rounds_with_dwm {
            let _ = window.set_shadow(false);
            apply_region(window, handle.0);
        }
    }
    #[cfg(not(windows))]
    let _ = window;
}

#[cfg(windows)]
fn apply_region(window: &tauri::WebviewWindow, hwnd: windows_sys::Win32::Foundation::HWND) {
    use windows_sys::Win32::{
        Foundation::{POINT, RECT},
        Graphics::Gdi::{ClientToScreen, CreateRoundRectRgn, DeleteObject, SetWindowRgn},
        UI::WindowsAndMessaging::{GetClientRect, GetWindowRect},
    };
    unsafe {
        if window.is_maximized().unwrap_or(false) || window.is_fullscreen().unwrap_or(false) {
            SetWindowRgn(hwnd, std::ptr::null_mut(), 1);
            return;
        }
        let mut frame = RECT::default();
        let mut client = RECT::default();
        let mut origin = POINT::default();
        if GetWindowRect(hwnd, &mut frame) == 0
            || GetClientRect(hwnd, &mut client) == 0
            || ClientToScreen(hwnd, &mut origin) == 0
        {
            return;
        }
        let width = client.right - client.left;
        let height = client.bottom - client.top;
        if width <= 0 || height <= 0 {
            return;
        }
        let diameter = (24.0 * window.scale_factor().unwrap_or(1.0)).round() as i32;
        // Regions use window coordinates, while the WebView fills the client area.
        // Exclude the hidden resize frame: it paints white once DWM rounding is bypassed.
        let left = origin.x - frame.left;
        let top = origin.y - frame.top;
        let region = CreateRoundRectRgn(left, top, left + width, top + height, diameter, diameter);
        if !region.is_null() && SetWindowRgn(hwnd, region, 1) == 0 {
            // Windows owns the region only after a successful transfer.
            DeleteObject(region);
        }
    }
}
