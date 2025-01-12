use serde::{Deserialize, Serialize};

use crate::task::Task;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppData {
    tasks: Vec<Task>,
}

#[derive(Default)]
pub struct AppState {
    pub counter: u32,
}

impl AppState {
    pub fn new() -> Self {
        Self { counter: 0 }
    }
}
