import { Button } from "@vita/ui/button";
import { Input } from "@vita/ui/input";
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@vita/ui/dialog";
import { filters, useApp } from "./context";
import Editor from "./Editor";
import { Task } from "./Task";

export default function App() {
  const a = useApp();
  const date = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
  return (
    <>
      <a className="skip-link" href="#content">
        跳到任务清单
      </a>
      <div className="app-bar">
        <span>合页 / 每件事，自有节奏</span>
        <span>{a.error ? "本机存储需要处理" : "保存在当前浏览器"}</span>
      </div>
      <div className="device">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              ◧
            </span>{" "}
            合页 <small>COLLAGE</small>
          </div>
          <p className="side-caption">我的任务</p>
          {filters.map((f, i) => (
            <button
              key={f}
              className={a.filter === f ? "selected" : ""}
              aria-pressed={a.filter === f}
              onClick={() => a.setFilter(f)}
            >
              <span>
                <span aria-hidden="true">{["☀", "▤", "✓"][i]}　</span>
                {f}
              </span>
              <small>
                {
                  a.tasks.filter(
                    (t) => f === "全部" || (f === "已完成" ? t.done : !t.done),
                  ).length
                }
              </small>
            </button>
          ))}
          <div className="side-bottom">
            <p>
              少一点安排的负担。
              <br />
              多一点生活的余地。
            </p>
          </div>
        </aside>
        <main id="content" tabIndex={-1}>
          <header className="page-head">
            <div>
              <p className="eyebrow">{date}</p>
              <h1>
                {a.filter === "已完成"
                  ? "留下的足迹"
                  : a.filter === "全部"
                    ? "生活的所有切片"
                    : "今天，慢慢来。"}
              </h1>
              <p className="muted">先记下一件事，再让细节各就其位。</p>
            </div>
            <Button
              disabled={a.blocked}
              onClick={a.newTask}
              className="primary"
            >
              ＋ 新建任务
            </Button>
          </header>
          {a.error && (
            <div className="storage-error" role="alert">
              <p>{a.error}</p>
              <Button
                variant="outline"
                onClick={a.blocked ? () => location.reload() : a.retry}
              >
                {a.blocked ? "重新加载" : "重试保存"}
              </Button>
            </div>
          )}
          <nav className="mobile-nav" aria-label="任务筛选">
            {filters.map((f) => (
              <button
                key={f}
                aria-pressed={a.filter === f}
                onClick={() => a.setFilter(f)}
              >
                {f}
              </button>
            ))}
          </nav>
          <div className="toolbar">
            <label className="search">
              <span>查找任务</span>
              <Input
                nativeInput
                value={a.query}
                onChange={(e) => a.setQuery(e.target.value)}
                placeholder="搜索你的生活切片"
                type="search"
              />
            </label>
          </div>
          <div className="list-layout">
            <section aria-label="任务清单">
              <div className="section-title">
                <h2>给今天一点方向</h2>
                <span>{a.visible.length} 件事</span>
              </div>
              {a.visible.map((t) => (
                <Task key={t.id} task={t} />
              ))}
              {!a.visible.length && !a.blocked && (
                <div className="empty">
                  <h2>{a.query ? "没有找到这件事" : "这里暂时留白"}</h2>
                  <p>
                    {a.query
                      ? "换个关键词，或记下一件新的任务。"
                      : "从一件想做的小事开始，细节可以稍后补上。"}
                  </p>
                  <Button onClick={a.newTask}>新建任务</Button>
                </div>
              )}
            </section>
            <aside className="quiet-aside">
              <span className="large-symbol" aria-hidden="true">
                ◷
              </span>
              <h2>
                先做一件，
                <br />
                就很好。
              </h2>
              <p>
                点击任务名称，展开它的细节。
                <br />
                从一个念头开始，需要时再添加时间、循环或计数。
              </p>
              <div className="small-rule" />
              <p>
                任务不必长得一样。
                <br />
                散步需要计时，喝水只需要轻轻点一下。
              </p>
            </aside>
          </div>
          <footer className="footnote">
            <span>
              {a.tasks.filter((t) => t.done).length} 件完成 · 不必把一天填满
            </span>
            <span>事件 / 时间 / 内容 / 循环 / 计时 / 计数</span>
          </footer>
          <p className="notice" role="status">
            {a.notice}
          </p>
        </main>
      </div>
      <Dialog
        open={Boolean(a.editing)}
        onOpenChange={(open) => {
          if (!open) a.setEditing(null);
        }}
      >
        <DialogPopup
          className="edit-dialog"
          showCloseButton={false}
          bottomStickOnMobile={false}
          initialFocus={
            matchMedia("(pointer: coarse)").matches
              ? false
              : () => document.getElementById("title")
          }
        >
          <DialogHeader>
            <DialogTitle>组合一件要做的事</DialogTitle>
            <DialogDescription>
              只留下需要的积木，按你的习惯排列。
            </DialogDescription>
          </DialogHeader>
          {a.editing && <Editor key={a.editing.id} draft={a.editing} />}
        </DialogPopup>
      </Dialog>
    </>
  );
}
