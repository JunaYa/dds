use serde::{Deserialize, Serialize};

use crate::task::Task;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AppState {
    pub tasks: Vec<Task>,
}

impl AppState {
    pub fn default() -> Self {
        Self { tasks: vec![] }
    }

    pub fn new() -> Self {
        Self { tasks: vec![] }
    }

    pub fn add_task(&mut self, task: Task) {
        self.tasks.push(task);
    }

    pub fn get_tasks(&self) -> Vec<Task> {
        self.tasks.clone()
    }

    pub fn remove_task(&mut self, id: String) {
        self.tasks.retain(|task| task.id != Some(id.clone()));
    }

    pub fn update_task(&mut self, task: Task) {
        if let Some(existing_task) = self.tasks.iter_mut().find(|t| t.id == task.id) {
            existing_task.update_name(task.name);
        }
    }
}
