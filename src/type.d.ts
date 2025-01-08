interface Task {
    id?: string;
    name: string;
    completed: boolean;
    createdAt: string;
    updatedAt?: string;
    completedAt?: string;
    duration?: number;
    tags?: string[];
    children?: Task[];
}