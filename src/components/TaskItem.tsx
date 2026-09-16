import { Button } from '@vita/ui/button';
import type { Task } from '../types';
import { formatTime, formatDuration } from '../utils/format';

interface TaskItemProps {
  task: Task;
  pending: string | null;
  disabled: boolean;
  onComplete: (id: string) => Promise<void>;
}

export function TaskItem({ task, pending, disabled, onComplete }: TaskItemProps) {
  return (
    <li>
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 text-card-foreground">
        <div className="min-w-0">
          <p className={`break-words text-sm font-medium ${task.completed ? 'text-muted-foreground line-through' : ''}`}>
            {task.name}
          </p>
          <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
            <span>创建 {formatTime(task.created_at)}</span>
            <span>{formatDuration(task.duration)}</span>
            {task.completed_at && <span>完成 {formatTime(task.completed_at)}</span>}
          </p>
        </div>
        {task.completed ? (
          <span className="shrink-0 text-xs text-muted-foreground">已完成</span>
        ) : (
          <Button size="xs" variant="outline" disabled={disabled || !task.id}
            loading={Boolean(task.id && pending === task.id)}
            aria-label={`完成：${task.name}`}
            onClick={() => { if (task.id) void onComplete(task.id); }}>完成</Button>
        )}
      </div>
      {task.children.length > 0 && (
        <ul className="mt-2 ml-3 flex flex-col gap-2 border-l pl-3">
          {task.children.map((child, index) => (
            <TaskItem key={child.id ?? index} task={child} pending={pending}
              disabled={disabled} onComplete={onComplete} />
          ))}
        </ul>
      )}
    </li>
  );
}
