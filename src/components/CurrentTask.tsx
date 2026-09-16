import type { Task } from '../types';
import { TaskItem } from './TaskItem';

interface CurrentTaskProps {
  tasks: Task[];
  loading: boolean;
  failed: boolean;
  pending: string | null;
  onComplete: (id: string) => Promise<void>;
}

export function CurrentTask({ tasks, loading, failed, pending, onComplete }: CurrentTaskProps) {
  return (
    <section className="task-list" aria-label="任务列表" aria-busy={loading}>
      {loading && tasks.length === 0 ? (
        <p role="status" className="empty-state">正在加载任务…</p>
      ) : tasks.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {tasks.map((task, index) => (
            <TaskItem key={task.id ?? index} task={task} pending={pending}
              disabled={loading || pending !== null} onComplete={onComplete} />
          ))}
        </ul>
      ) : !failed ? (
        <p className="empty-state">还没有任务</p>
      ) : null}
    </section>
  );
}
