use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: Option<String>,
    pub name: String,
    pub completed: bool,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
    pub duration: i32,
    pub tags: Vec<String>,
    pub children: Vec<Task>,
}

impl Task {
    pub fn new(name: String) -> Self {
        Self {
            id: Some(Uuid::new_v4().to_string()),
            name,
            completed: false,
            created_at: chrono::Utc::now().to_string(),
            updated_at: chrono::Utc::now().to_string(),
            completed_at: None,
            duration: 0,
            tags: vec![],
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

    pub fn update_name(&mut self, name: String) {
        self.name = name;
    }

    pub fn add_child(mut self, child: Task) -> Self {
        self.children.push(child);
        self
    }

    pub fn add_children(mut self, children: Vec<Task>) -> Self {
        self.children.extend(children);
        self
    }

    pub fn set_completed(mut self) -> Self {
        self.completed = true;
        self.completed_at = Some(chrono::Utc::now().to_rfc3339());
        self
    }

    pub fn set_duration(mut self, duration: i32) -> Self {
        self.duration = duration;
        self
    }
}
