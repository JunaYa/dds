export interface Task {
  id?: string | null;
  name: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  duration: number;
  tags: string[];
  children: Task[];
}
