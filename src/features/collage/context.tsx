import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  newTask,
  elapsedSeconds,
  finishTimer,
  nextOccurrence,
  saveDraft,
  toggleDone,
  toggleTimer,
  type Task,
} from "./model";
import { loadTasks, persistTasks } from "./storage";
export const filters = ["进行中", "全部", "已完成"] as const;
type Filter = (typeof filters)[number];
function useWorkspace() {
  const [loaded] = useState(loadTasks);
  const [tasks, setTasks] = useState(loaded.tasks);
  const [filter, setFilter] = useState<Filter>("进行中");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Task | null>(null);
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);
  const running = tasks.some((t) => t.started !== null);
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      setTasks((current) => {
        const next = current.map((t) => finishTimer(t, time));
        return next.some((t, i) => t !== current[i]) ? next : current;
      });
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [running]);
  useEffect(() => {
    if (!loaded.error) setSaveError(persistTasks(tasks));
  }, [tasks, loaded.error]);
  function change(id: string, transform: (task: Task) => Task) {
    if (loaded.error) return;
    setTasks((current) => current.map((t) => (t.id === id ? transform(t) : t)));
    setNow(Date.now());
  }
  const visible = tasks.filter(
    (t) =>
      (filter === "全部" || (filter === "已完成" ? t.done : !t.done)) &&
      t.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  return {
    tasks,
    visible,
    filter,
    setFilter,
    query,
    setQuery,
    editing,
    setEditing,
    notice,
    error: loaded.error || saveError,
    blocked: Boolean(loaded.error),
    retry: () => setSaveError(persistTasks(tasks)),
    seconds: (t: Task) => elapsedSeconds(t, now),
    newTask: () => {
      if (!loaded.error) setEditing(newTask());
    },
    toggleTimer: (t: Task) => change(t.id, (task) => toggleTimer(task)),
    count: (t: Task, step: number) =>
      change(t.id, (task) =>
        task.done
          ? task
          : {
              ...task,
              value: Math.max(0, Math.min(task.count, task.value + step)),
            },
      ),
    toggleDone: (t: Task) => {
      change(t.id, (task) => toggleDone(task));
      setNotice(t.done ? "任务已恢复" : "本次已完成");
    },
    next: (t: Task) => {
      change(t.id, nextOccurrence);
      setFilter("进行中");
      setNotice("已开始下一次循环");
    },
    save: (draft: Task) => {
      if (loaded.error) return;
      const saved = saveDraft(draft);
      setTasks((current) =>
        current.some((t) => t.id === saved.id)
          ? current.map((t) => (t.id === saved.id ? saved : t))
          : [...current, saved],
      );
      setFilter(saved.done ? "已完成" : "进行中");
      setQuery("");
      setEditing(null);
      setNotice("组合已保存");
    },
  };
}
const Workspace = createContext<ReturnType<typeof useWorkspace> | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const value = useWorkspace();
  return <Workspace.Provider value={value}>{children}</Workspace.Provider>;
}
export function useApp() {
  const context = useContext(Workspace);
  if (!context) throw new Error("Collage requires WorkspaceProvider");
  return context;
}
