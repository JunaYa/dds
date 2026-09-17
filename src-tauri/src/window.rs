use tauri::{AppHandle, Manager};
use crate::constants::MAIN_WINDOW;

pub fn show_main_window(app: &AppHandle) -> Result<(), String> {
    let window = app.get_webview_window(MAIN_WINDOW).ok_or("主窗口不可用")?;
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())
}
