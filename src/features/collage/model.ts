export const blockNames = {
  event: "事件",
  time: "时间",
  content: "内容",
  repeat: "循环",
  timer: "计时",
  count: "计数",
} as const;
export type Block = keyof typeof blockNames;
export const blocks = Object.keys(blockNames) as Block[];
export const frequencies = ["每天", "工作日", "每周"] as const;
export type Task = {
  id: string;
  title: string;
  blocks: Block[];
  content: string;
  event: string;
  time: string;
  repeat: (typeof frequencies)[number];
  timer: number;
  count: number;
  value: number;
  elapsed: number;
  started: number | null;
  done: boolean;
};
export function newTask(): Task {
  return {
    id: crypto.randomUUID(),
    title: "",
    blocks: ["content"],
    content: "",
    event: "早餐后",
    time: "09:00",
    repeat: "每天",
    timer: 25,
    count: 8,
    value: 0,
    elapsed: 0,
    started: null,
    done: false,
  };
}
export function elapsedSeconds(task: Task, now = Date.now()): number {
  return Math.min(
    task.timer * 60,
    task.elapsed +
      (task.started === null
        ? 0
        : Math.max(0, Math.floor((now - task.started) / 1000))),
  );
}
export function toggleTimer(task: Task, now = Date.now()): Task {
  if (task.done || !task.blocks.includes("timer")) return task;
  const elapsed = elapsedSeconds(task, now);
  return task.started !== null
    ? { ...task, elapsed, started: null }
    : {
        ...task,
        elapsed: elapsed >= task.timer * 60 ? 0 : elapsed,
        started: now,
      };
}
export function finishTimer(task: Task, now = Date.now()): Task {
  return task.started !== null && elapsedSeconds(task, now) >= task.timer * 60
    ? { ...task, elapsed: task.timer * 60, started: null }
    : task;
}
export function toggleDone(task: Task, now = Date.now()): Task {
  return {
    ...task,
    done: !task.done,
    elapsed: elapsedSeconds(task, now),
    started: null,
  };
}
export function nextOccurrence(task: Task): Task {
  if (!task.done || !task.blocks.includes("repeat")) return task;
  return { ...task, done: false, value: 0, elapsed: 0, started: null };
}
export function saveDraft(task: Task, now = Date.now()): Task {
  const normalized = {
    ...task,
    timer:
      Number.isInteger(task.timer) && task.timer > 0
        ? Math.min(task.timer, 1440)
        : 25,
    count:
      Number.isInteger(task.count) && task.count > 0
        ? Math.min(task.count, 1440)
        : 8,
    time: /^([01]\d|2[0-3]):[0-5]\d$/.test(task.time) ? task.time : "09:00",
  };
  return {
    ...normalized,
    title: task.title.trim(),
    started: null,
    elapsed: elapsedSeconds(normalized, now),
    value: Math.min(task.value, normalized.count),
  };
}
