use std::sync::Mutex;

use tauri::ActivationPolicy;
mod tray;
mod cmd;
mod window;
mod constants;
mod task;
mod appData;
use appData::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                tray::create_tray(app)?;
                // Make the Dock icon invisible
                app.set_activation_policy(ActivationPolicy::Accessory);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            cmd::greet,
            cmd::show_main_window,
            cmd::hide_main_window,
            cmd::add_task,
            cmd::get_current_tasks,
            cmd::remove_task,
            cmd::update_task,
        ])
        .manage(Mutex::new(AppState::default()))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

