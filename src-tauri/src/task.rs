use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub name: String,
    pub completed: bool,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: String,
    pub duration: i32,
    pub children: Vec<Task>,
}

impl Task {
    pub fn new(name: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            completed: false,
            created_at: chrono::Utc::now().to_string(),
            updated_at: String::new(),
            completed_at: String::new(),
            duration: 0,
            children: vec![],
        }
    }

    pub fn update_task(mut self, task: Task) -> Self {
        self.name = task.name;
        self.completed = task.completed;
        self.updated_at = chrono::Utc::now().to_string();
        self.duration = task.duration;
        self
    }

    pub fn update_name(mut self, name: String) -> Self {
        self.name = name;
        self.updated_at = chrono::Utc::now().to_string();
        self
    }

    pub fn add_child(mut self, child: Task) -> Self {
        self.children.push(child);
        self
    }

    pub fn add_children(mut self, children: Vec<Task>) -> Self {
        self.children.extend(children);
        self
    }

    pub fn set_completed(mut self, completed: bool) -> Self {
        self.completed = completed;
        self
    }

    pub fn set_duration(mut self, duration: i32) -> Self {
        self.duration = duration;
        self
    }

    pub fn set_updated_at(mut self, updated_at: String) -> Self {
        self.updated_at = updated_at;
        self
    }

    pub fn set_completed_at(mut self, completed_at: String) -> Self {
        self.completed_at = completed_at;
        self
    }

}
