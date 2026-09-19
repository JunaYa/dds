import { blockNames, frequencies, type Task } from "./model";
export const storageKey = "dds.collage.tasks.v1";
function validTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const t = value as Record<string, unknown>;
  const integer = (n: unknown, min: number, max: number): n is number =>
    typeof n === "number" && Number.isInteger(n) && n >= min && n <= max;
  return (
    typeof t.id === "string" &&
    t.id.length > 0 &&
    typeof t.title === "string" &&
    t.title.trim().length > 0 &&
    Array.isArray(t.blocks) &&
    t.blocks.every(
      (b) => typeof b === "string" && Object.hasOwn(blockNames, b),
    ) &&
    new Set(t.blocks).size === t.blocks.length &&
    typeof t.content === "string" &&
    typeof t.event === "string" &&
    typeof t.time === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(t.time) &&
    frequencies.some((f) => f === t.repeat) &&
    integer(t.timer, 1, 1440) &&
    integer(t.count, 1, 1440) &&
    integer(t.value, 0, t.count as number) &&
    integer(t.elapsed, 0, (t.timer as number) * 60) &&
    (t.started === null || integer(t.started, 0, Number.MAX_SAFE_INTEGER)) &&
    typeof t.done === "boolean" &&
    !(t.started !== null && (t.done || !t.blocks.includes("timer")))
  );
}
export function loadTasks(): { tasks: Task[]; error: string | null } {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) return { tasks: [], error: null };
    const data: unknown = JSON.parse(raw);
    if (
      !Array.isArray(data) ||
      !data.every(validTask) ||
      new Set(data.map((t) => t.id)).size !== data.length
    ) {
      throw new Error("任务文件格式不正确");
    }
    return { tasks: data, error: null };
  } catch {
    return {
      tasks: [],
      error: "无法读取本机任务，原有数据未被覆盖。请检查浏览器存储后重新加载。",
    };
  }
}
export function persistTasks(tasks: Task[]): string | null {
  try {
    localStorage.setItem(storageKey, JSON.stringify(tasks));
    return null;
  } catch {
    return "未能保存到本机。当前更改仍在页面中，请勿关闭页面，并腾出存储空间后重试。";
  }
}
