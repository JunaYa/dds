use std::sync::Mutex;

use tauri::{AppHandle, State};
use tracing::info;

use crate::task::Task;
use crate::window;
use crate::appData::AppState;
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
pub fn get_current_tasks(state: State<Mutex<AppState>>) -> Vec<Task> {
    let state = state.lock().unwrap();
    state.get_tasks()
}

#[tauri::command]
pub fn add_task(name: String, state: State<Mutex<AppState>>) -> bool {
    info!("add_task: {:?}", name);
    let mut state: std::sync::MutexGuard<'_, AppState> = state.lock().unwrap();
    let new_task = Task::new(name);
    state.add_task(new_task);
    true
}

#[tauri::command]
pub fn remove_task(id: String, state: State<Mutex<AppState>>) -> bool {
    let mut state = state.lock().unwrap();
    state.remove_task(id);
    true
}

#[tauri::command]
pub fn update_task(task: Task, state: State<Mutex<AppState>>) -> bool {
    let mut state = state.lock().unwrap();
    state.update_task(task);
    true
}

