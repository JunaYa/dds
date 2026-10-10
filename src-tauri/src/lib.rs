use std::sync::Mutex;

#[cfg(desktop)]
mod tray;
mod cmd;
#[cfg(desktop)]
mod window;
#[cfg(desktop)]
mod constants;
mod task;
mod quick_record;
mod appData;
use appData::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();
    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                quick_record::close_requested(window, api);
            }
        });
    #[cfg(target_os = "ios")]
    let builder = builder.plugin(tauri_plugin_native_navigation::init());

    builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|_app| {
            #[cfg(desktop)]
            {
                tray::create_tray(_app)?;
                quick_record::setup(_app.handle())?;
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
            quick_record::quick_record_status,
            quick_record::set_quick_record_shortcut,
            quick_record::present_quick_record,
        ])
        .manage(Mutex::new(AppState::default()))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
