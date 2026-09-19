import { useApp } from "./context";
import type { Task as TaskModel } from "./model";
export function Tags({ task }: { task: TaskModel }) {
  return (
    <div className="tags">
      {task.blocks.map((b) => (
        <span key={b}>
          {b === "time"
            ? task.time
            : b === "repeat"
              ? `↻ ${task.repeat}`
              : b === "timer"
                ? `${task.timer} 分钟`
                : b === "count"
                  ? `${task.value} / ${task.count} 次`
                  : b === "event"
                    ? task.event
                    : "笔记"}
        </span>
      ))}
    </div>
  );
}
export function Actions({ task: t }: { task: TaskModel }) {
  const a = useApp(),
    sec = Math.max(0, t.timer * 60 - a.seconds(t));
  return (
    <div className="task-actions">
      {t.blocks.includes("timer") && (
        <div className="timer">
          <span>
            {String(Math.floor(sec / 60)).padStart(2, "0")}:
            {String(sec % 60).padStart(2, "0")}
          </span>
          <button disabled={t.done} onClick={() => a.toggleTimer(t)}>
            {t.started !== null ? "暂停" : sec === 0 ? "重新计时" : "开始"}
          </button>
        </div>
      )}
      {t.blocks.includes("count") && (
        <div className="counter">
          <button
            aria-label={`减少${t.title}次数`}
            disabled={t.done || t.value === 0}
            onClick={() => a.count(t, -1)}
          >
            −
          </button>
          <span>
            {t.value}
            <small> / {t.count}</small>
          </span>
          <button
            aria-label={`增加${t.title}次数`}
            disabled={t.done || t.value >= t.count}
            onClick={() => a.count(t, 1)}
          >
            ＋
          </button>
        </div>
      )}
    </div>
  );
}
export function Task({ task: t }: { task: TaskModel }) {
  const a = useApp();
  return (
    <article className={`task ${t.done ? "done" : ""}`}>
      <div className="task-top">
        <button
          className="check"
          aria-label={`${t.done ? "恢复" : "完成"}${t.title}`}
          aria-pressed={t.done}
          onClick={() => a.toggleDone(t)}
        >
          <span>{t.done ? "✓" : ""}</span>
        </button>
        <button
          className="task-title"
          onClick={() => a.setEditing({ ...t, blocks: [...t.blocks] })}
        >
          {t.title}
        </button>
      </div>
      <Tags task={t} />
      <Actions task={t} />
      {t.done && t.blocks.includes("repeat") && (
        <button className="next" onClick={() => a.next(t)}>
          开始下一次 · {t.repeat}
        </button>
      )}
    </article>
  );
}
