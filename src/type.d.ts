interface Task {
    id?: string;
    name: string;
    completed: boolean;
    created_at: string;
    updated_at: string;
    completed_at?: string;
    duration: number;
    tags: string[];
    children: Task[];
}