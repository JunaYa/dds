use std::str::FromStr;

use strum_macros::{Display, EnumString};
use tauri::{
    menu::{Menu, MenuEvent, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};
use tauri_plugin_positioner::WindowExt;
use tracing::info;

#[derive(Debug, Display, EnumString)]
#[allow(non_camel_case_types, clippy::upper_case_acronyms)]
enum MenuID {
    EXIT,
}

pub fn create_tray(app: &mut tauri::App) -> Result<(), tauri::Error> {
    let _ = TrayIconBuilder::with_id("main-tray")
        // .menu(&get_tray_menu(app.handle())?)
        .icon(app.default_window_icon().unwrap().clone())
        .icon_as_template(true)
        .show_menu_on_left_click(true)
        .on_menu_event(handle_tray_menu_events)
        .on_tray_icon_event(handle_tray_icon_events)
        .build(app)?;
    Ok(())
}

pub fn get_tray_menu(app: &AppHandle) -> Result<Menu<tauri::Wry>, tauri::Error> {
    let tray = Menu::with_id(app, "tray_menu")?;

    tray.append_items(&[
        &MenuItem::with_id(app, MenuID::EXIT.to_string(), "Exit", true, None::<&str>)?,
    ])?;

    Ok(tray)
}

fn handle_tray_icon_events(tray: &TrayIcon, event: TrayIconEvent) {
    let app = tray.app_handle();
    tauri_plugin_positioner::on_tray_event(app.app_handle(), &event);
    
    match event {
        TrayIconEvent::Click {
            id: _,
            position: _,
            rect: _,
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
        } => {
            println!("left click pressed and released");
            if let Some(window) = app.get_webview_window("main") {
                if window.is_visible().unwrap_or(false) {
                    let _ = window.hide();
                } else {
                    let _ = window.move_window(tauri_plugin_positioner::Position::TrayBottomCenter);
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = window.set_always_on_top(true);
                }
            }
        }
        TrayIconEvent::Enter {
            id: _,
            position: _,
            rect: _,
        } => {
            println!("mouse entered tray icon");
            // if let Some(window) = app.get_webview_window("main") {
            //     if !window.is_visible().unwrap_or(false) {
            //         let _ =
            //             window.move_window(tauri_plugin_positioner::Position::TrayBottomCenter);
            //         let _ = window.show();
            //         let _ = window.set_focus();
            //         let _ = window.set_always_on_top(true);
            //     }
            // }
        }
        TrayIconEvent::Leave {
            id: _,
            position: _,
            rect: _,
        } => {
            println!("mouse left tray icon");
            // if let Some(window) = app.get_webview_window("main") {
            //     if !window.is_visible().unwrap_or(false) {
            //         let _ =
            //             window.move_window(tauri_plugin_positioner::Position::TrayBottomCenter);
            //         let _ = window.show();
            //         let _ = window.set_focus();
            //     } else {
            //         let _ = window.hide();
            //     }
            // }
        }
        TrayIconEvent::Move {
            id: _,
            position: _,
            rect: _,
        } => {
            println!("mouse moved over tray icon");
        }
        _ => {
            println!("unhandled event");
        }
    }
}

fn handle_tray_menu_events(app: &AppHandle, event: MenuEvent) {
    let menu_id = if let Ok(menu_id) = MenuID::from_str(event.id.as_ref()) {
        menu_id
    } else {
        return;
    };

    match menu_id {
        MenuID::EXIT => {
            info!("Exit");
            app.exit(0)
        }
    }
}
