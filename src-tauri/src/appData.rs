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

    pub fn complete_task(&mut self, id: String) {
        if let Some(existing_task) = self.tasks.iter_mut().find(|t| t.id.as_deref() == Some(id.as_str())) {
            existing_task.set_completed();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn completing_a_task_updates_the_stored_task_only() {
        let mut state = AppState::default();
        let task = Task::new("Migrate UI".into());
        let id = task.id.clone().unwrap();
        state.add_task(task);
        state.add_task(Task::new("Next task".into()));

        state.complete_task(id);

        let tasks = state.get_tasks();
        assert!(tasks[0].completed);
        assert!(tasks[0].completed_at.is_some());
        assert!(!tasks[1].completed);
        assert!(tasks[1].completed_at.is_none());
    }

    #[test]
    fn completing_an_unknown_id_leaves_tasks_unchanged() {
        let mut state = AppState::default();
        state.add_task(Task::new("Keep this task".into()));
        state.complete_task("missing".into());
        assert_eq!(state.get_tasks().len(), 1);
        assert!(!state.get_tasks()[0].completed);
    }
}
