use tauri::{
    Emitter,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};
use crate::window;

pub fn create_tray(app: &mut tauri::App) -> Result<(), tauri::Error> {
    let open = MenuItem::with_id(app, "open", "打开 Little days", true, None::<&str>)?;
    let quick_record = MenuItem::with_id(app, "quick-record", "快捷记录（全屏）", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &quick_record, &quit])?;
    let tray = TrayIconBuilder::with_id("main-tray")
        .icon(tauri::include_image!("icons/tray-white.png"))
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => { let _ = window::show_main_window(app); }
            "quick-record" => {
                if let Err(error) = app.emit_to("main", "quick-record-open", ()) {
                    tracing::error!(%error, "Could not open quick recording from tray");
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event {
                let _ = window::show_main_window(tray.app_handle());
            }
        });
    tray.build(app)?;
    Ok(())
}
