import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { Button } from '@vita/ui/button';
import { Input } from '@vita/ui/input';
import { CurrentTask } from './components/CurrentTask';
import type { Task } from './types';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mutationInFlight = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!isTauri()) throw new Error('请在 DDS 桌面应用中管理任务');
      setTasks(await invoke<Task[]>('get_current_tasks'));
    } catch (cause) {
      setError(`无法加载任务：${errorMessage(cause)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || mutationInFlight.current || loading) return;
    mutationInFlight.current = true;
    setPending('add');
    setError(null);
    try {
      const added = await invoke<boolean>('add_task', { name: trimmedName });
      if (!added) throw new Error('任务未保存，请重试');
      setName('');
      await refresh();
    } catch (cause) {
      setError(`无法添加任务：${errorMessage(cause)}`);
    } finally {
      mutationInFlight.current = false;
      setPending(null);
    }
  }

  async function completeTask(id: string) {
    if (mutationInFlight.current || loading) return;
    mutationInFlight.current = true;
    setPending(id);
    setError(null);
    try {
      const completed = await invoke<boolean>('complete_task', { id });
      if (!completed) throw new Error('任务未完成，请重试');
      await refresh();
    } catch (cause) {
      setError(`无法完成任务：${errorMessage(cause)}`);
    } finally {
      mutationInFlight.current = false;
      setPending(null);
    }
  }

  return (
    <main className="task-panel" aria-labelledby="task-heading">
      <header className="flex items-center justify-between gap-3">
        <h1 id="task-heading" className="text-base font-semibold">今日任务</h1>
        <span className="text-xs text-muted-foreground">DDS</span>
      </header>
      <form className="flex items-center gap-2" onSubmit={addTask}>
        <label className="sr-only" htmlFor="task-name">任务名称</label>
        <Input
          id="task-name" value={name} onChange={(event) => setName(event.target.value)}
          placeholder="接下来要做什么？" autoComplete="off"
          disabled={pending === 'add'}
        />
        <Button type="submit" size="sm" variant="primary" loading={pending === 'add'}
          disabled={!name.trim() || loading || pending !== null}>
          添加任务
        </Button>
      </form>
      {error && (
        <div role="alert" className="flex items-center justify-between gap-2 text-xs text-destructive">
          <span className="min-w-0 break-words">{error}</span>
          <Button size="xs" variant="ghost" onClick={() => void refresh()}
            disabled={loading || pending !== null}>重新加载</Button>
        </div>
      )}
      <CurrentTask tasks={tasks} loading={loading} failed={error !== null}
        pending={pending} onComplete={completeTask} />
    </main>
  );
}
import './TaskApp.css';
