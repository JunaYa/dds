use std::sync::Mutex;

#[cfg(desktop)]
mod tray;
mod cmd;
#[cfg(desktop)]
mod window;
#[cfg(desktop)]
mod constants;
mod task;
mod appData;
use appData::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|_app| {
            #[cfg(desktop)]
            {
                tray::create_tray(_app)?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            cmd::greet,
            cmd::add_task,
            cmd::get_current_tasks,
            cmd::remove_task,
            cmd::update_task,
            cmd::complete_task,
        ])
        .manage(Mutex::new(AppState::default()))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
