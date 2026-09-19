import { useState } from "react";
import { Button } from "@vita/ui/button";
import { Input } from "@vita/ui/input";
import { blocks, blockNames, type Task } from "./model";
import { useApp } from "./context";
export default function Editor({ draft }: { draft: Task }) {
  const a = useApp(),
    [d, setD] = useState({ ...draft, blocks: [...draft.blocks] });
  const set = <K extends keyof Task>(k: K, v: Task[K]) =>
    setD((x) => ({ ...x, [k]: v }));
  const reorder = (i: number, j: number) => {
    const b = [...d.blocks];
    [b[i], b[j]] = [b[j], b[i]];
    set("blocks", b);
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (d.title.trim()) a.save(d);
      }}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.requestSubmit();
        }
      }}
    >
      <label className="field">
        任务名称
        <Input
          nativeInput
          id="title"
          required
          value={d.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="例如：早餐后读书 20 分钟"
        />
      </label>
      <p className="field-label">添加积木</p>
      <div className="block-bank">
        {blocks.map((k) => (
          <button
            type="button"
            aria-pressed={d.blocks.includes(k)}
            key={k}
            onClick={() =>
              set(
                "blocks",
                d.blocks.includes(k)
                  ? d.blocks.filter((b) => b !== k)
                  : [...d.blocks, k],
              )
            }
          >
            {d.blocks.includes(k) ? "✓" : "＋"} {blockNames[k]}
          </button>
        ))}
      </div>
      <div className="blocks">
        {d.blocks.map((b, i) => (
          <section className="block" key={b}>
            <div className="block-head">
              <strong>
                {String(i + 1).padStart(2, "0")}　{blockNames[b]}
              </strong>
              <div>
                <button
                  type="button"
                  aria-label={`上移${blockNames[b]}`}
                  disabled={i === 0}
                  onClick={() => reorder(i, i - 1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`下移${blockNames[b]}`}
                  disabled={i === d.blocks.length - 1}
                  onClick={() => reorder(i, i + 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`移除${blockNames[b]}`}
                  onClick={() =>
                    set(
                      "blocks",
                      d.blocks.filter((v) => v !== b),
                    )
                  }
                >
                  ×
                </button>
              </div>
            </div>
            <label className="field">
              <span>
                {
                  {
                    event: "发生在什么之后",
                    time: "计划时间",
                    content: "笔记与内容",
                    repeat: "重复频率",
                    timer: "计时目标（分钟）",
                    count: "计数目标（次）",
                  }[b]
                }
              </span>
              {b === "content" ? (
                <textarea
                  value={d[b]}
                  onChange={(e) => set(b, e.target.value)}
                  rows={3}
                />
              ) : b === "repeat" ? (
                <select
                  value={d[b]}
                  onChange={(e) => set(b, e.target.value as Task["repeat"])}
                >
                  <option>每天</option>
                  <option>工作日</option>
                  <option>每周</option>
                </select>
              ) : (
                <input
                  required
                  type={
                    b === "time"
                      ? "time"
                      : ["timer", "count"].includes(b)
                        ? "number"
                        : "text"
                  }
                  min="1"
                  max="1440"
                  value={d[b]}
                  onChange={(e) =>
                    set(
                      b,
                      ["timer", "count"].includes(b)
                        ? Number(e.target.value)
                        : e.target.value,
                    )
                  }
                />
              )}
            </label>
          </section>
        ))}
      </div>
      <p className="muted">
        事件是情境提示；循环以「本次完成 →
        开始下一次」体验。当前不发送定时提醒。
      </p>
      <div className="form-footer">
        <Button
          type="button"
          variant="ghost"
          onClick={() => a.setEditing(null)}
        >
          取消
        </Button>
        <Button className="primary" type="submit" disabled={!d.title.trim()}>
          保存组合
        </Button>
      </div>
    </form>
  );
}
