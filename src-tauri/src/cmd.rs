use tauri::AppHandle;

use crate::window;
use crate::task::Task;
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// show popup add task
#[tauri::command]
pub fn show_main_window(app: AppHandle) {
    let window = window::get_main_window(&app);
    window::show_main_window(&window);
}

#[tauri::command]
pub fn hide_main_window(app: AppHandle) {
    let window = window::get_main_window(&app);
    window::hide_main_window(&window);
}

#[tauri::command]
pub fn get_current_tasks() -> Vec<Task> {
    vec![Task::new("test".to_string())]
}
