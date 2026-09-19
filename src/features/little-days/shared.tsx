import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@vita/ui/button";
import { Input } from "@vita/ui/input";
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@vita/ui/dialog";
import { useApp, type Page } from "./store";
import {
  age,
  elapsedSeconds,
  summary,
  formatTimer,
  type CareRecord,
} from "./model";
import { RecordForm, TypeBuilder, SupplyForm, ChildForm } from "./forms";
import { Icon } from "./icon";
import { NursingTimer } from "./NursingTimer";
import { NursingMiniBar } from "./NursingMiniBar";
export { Icon, useApp };
const pages: Page[] = ["Today", "Supplies", "Record types"];

export function SaveError() {
  const { error } = useApp();
  return error ? (
    <p className="save-error" role="alert">
      {error}
    </p>
  ) : null;
}
export function Shell({ children }: { children: ReactNode }) {
  const a = useApp();
  if (!a.activeChild) return null;
  return (
    <>
      <div className="app-frame">
        <aside className="sidebar">
          <div className="brand">
            <Icon name="leaf" size={27} />
            <strong>
              little days<span>A little less to remember</span>
            </strong>
          </div>
          <ChildPicker />
          <nav aria-label="Main navigation">
            {pages.map((page, i) => (
              <button
                key={page}
                className={a.page === page ? "active" : ""}
                aria-current={a.page === page ? "page" : undefined}
                onClick={() => a.setPage(page)}
              >
                <Icon name={["book", "box", "spark"][i]} />
                {page}
              </button>
            ))}
          </nav>
          <div className="side-note">
            <span className="tiny-title">THE LITTLE THINGS ADD UP</span>
            <p>
              A bottle, a nap, a fresh diaper.
              <br />
              One day at a time.
            </p>
            <span>Stored on this device</span>
          </div>
        </aside>
        <main>
          <div className="mobile-profile">
            <ChildPicker />
          </div>
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {pages.map((page) => (
              <button
                key={page}
                aria-pressed={a.page === page}
                onClick={() => a.setPage(page)}
              >
                {page}
              </button>
            ))}
          </nav>
          <header className="page-heading">
            <div>
              <div className="eyebrow">
                {new Date(`${a.day}T12:00`).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}{" "}
                <span>•</span> {a.activeChild.age}
              </div>
              <h1>
                {a.page === "Today"
                  ? `${a.activeChild.name}’s little day`
                  : a.page === "Supplies"
                    ? "Ready for the everyday."
                    : "Make room for your routine."}
              </h1>
              <p>
                {a.page === "Today"
                  ? a.activeChild.caption
                  : a.page === "Supplies"
                    ? "Family supplies, with one less thing to keep in your head."
                    : "Choose what matters. Build a record that fits."}
              </p>
            </div>
            {a.page === "Today" ? (
              <Button
                className="primary"
                onClick={() => a.openRecord(a.types[0])}
              >
                ＋ Add a record
              </Button>
            ) : (
              <Button
                className="primary"
                onClick={() =>
                  a.setModal({
                    kind: a.page === "Supplies" ? "supply" : "type",
                  })
                }
              >
                ＋ {a.page === "Supplies" ? "Add supply" : "Create record type"}
              </Button>
            )}
          </header>
          <SaveError />
          <SessionBanner />
          {a.page === "Today" ? (
            children
          ) : a.page === "Supplies" ? (
            <Supplies />
          ) : (
            <Types />
          )}
          <div className="notice" role="status">
            {a.notice}
            {a.undo && <button onClick={a.undo}>Undo</button>}
          </div>
          <footer className="app-footer">
            Saved on this device · No cloud sync
          </footer>
        </main>
      </div>
      <Modal />
      <NursingMiniBar />
      <NursingTimer />
    </>
  );
}
function ChildPicker() {
  const a = useApp();
  return (
    <div className="child-picker">
      <span className="avatar">{a.activeChild?.initial}</span>
      <label>
        <small>RECORDING FOR</small>
        <select
          aria-label="Child"
          value={a.child}
          onChange={(e) => a.setChild(e.target.value)}
        >
          {a.children.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {age(c.birthday)}
            </option>
          ))}
        </select>
      </label>
      <button
        className="add-child"
        aria-label="Add child"
        onClick={() => a.setModal({ kind: "child" })}
      >
        ＋
      </button>
    </div>
  );
}
export function SessionBanner() {
  const a = useApp();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!a.session || a.session.nursing) return;
    const refresh = () => setNow(Date.now());
    refresh();
    const id = setInterval(refresh, 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [a.session]);
  if (!a.session || a.session.nursing) return null;
  const session = a.session,
    type = a.types.find((t) => t.id === session.type),
    kid = a.children.find((c) => c.id === session.child);
  return (
    <section className="session-banner">
      <Icon name={type?.icon} />
      <div>
        <strong>
          {kid?.name} · {type?.name}
        </strong>
        <span>{session.started === null ? "Paused" : "Timer running"}</span>
      </div>
      <output aria-label="Elapsed time">
        {formatTimer(elapsedSeconds(session, now))}
      </output>
      <button onClick={a.pauseSession}>
        {session.started === null ? "Resume" : "Pause"}
      </button>
      <Button variant="outline" onClick={a.finishSession}>
        Finish & save
      </Button>
    </section>
  );
}
export function Log({
  title = "Records",
  compact = false,
}: {
  title?: string;
  compact?: boolean;
}) {
  const a = useApp();
  const [limit, setLimit] = useState(12);
  useEffect(() => setLimit(12), [a.child, a.range, a.query]);
  return (
    <section className={`log ${compact ? "compact" : ""}`}>
      <div className="section-heading">
        <h2>{title}</h2>
        <span>{a.visible.length} records</span>
      </div>
      {!a.visible.length && (
        <div className="empty">
          <Icon name="book" size={32} />
          <h3>A little space for the next thing.</h3>
          <p>No records match this view.</p>
          <Button onClick={() => a.openRecord(a.types[0])}>Add a record</Button>
        </div>
      )}
      {a.visible.slice(0, limit).map((record) => (
        <RecordRow key={record.id} record={record} />
      ))}
      {a.visible.length > limit && (
        <button className="load-more" onClick={() => setLimit((n) => n + 12)}>
          Show 12 more records
        </button>
      )}
    </section>
  );
}
function RecordRow({ record }: { record: CareRecord }) {
  const a = useApp(),
    type = a.types.find((t) => t.id === record.type);
  if (!type) return null;
  return (
    <article className="record">
      <time dateTime={record.time}>
        {record.time.slice(11, 16)}
        {a.range === "all" && <small>{record.time.slice(0, 10)}</small>}
      </time>
      <span className={`record-dot ${type.id}`}>
        <Icon name={type.icon} size={19} />
      </span>
      <button
        className="record-content"
        onClick={() => a.openRecord(type, record)}
      >
        <strong>{type.name}</strong>
        <span>{summary(record, type)}</span>
        {record.note && <p>{record.note}</p>}
      </button>
      <button
        className="record-edit"
        aria-label={`Edit ${type.name} at ${record.time.slice(11, 16)}`}
        onClick={() => a.openRecord(type, record)}
      >
        ↗
      </button>
    </article>
  );
}
export function LogTools() {
  const a = useApp();
  return (
    <div className="log-tools">
      <div className="segmented">
        {[
          ["today", "Today"],
          ["all", "All records"],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-pressed={a.range === id}
            onClick={() => a.setRange(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <Input
        nativeInput
        aria-label="Search records"
        type="search"
        placeholder="Find a record…"
        value={a.query}
        onChange={(e) => a.setQuery(e.target.value)}
      />
    </div>
  );
}
function Supplies() {
  const a = useApp();
  return (
    <>
      <p className="section-intro">
        Stock is shared by the family. Recording care does not deduct supplies
        automatically.
      </p>
      {!a.supplies.length && (
        <div className="empty">
          <Icon name="box" size={32} />
          <h3>Make room for the essentials.</h3>
          <p>Add diapers, wipes, tissues, vitamins, or any supply you keep.</p>
          <Button onClick={() => a.setModal({ kind: "supply" })}>
            Add supply
          </Button>
        </div>
      )}
      <div className="supply-grid">
        {a.supplies.map((item) => (
          <article className="supply-card" key={item.id}>
            <div className="section-heading">
              <Icon name="box" />
              {item.stock <= item.low && (
                <span className="low">Refill soon</span>
              )}
            </div>
            <h2>{item.name}</h2>
            <p className="stock-number">
              {item.stock}
              <span>{item.unit} left</span>
            </p>
            <p className="muted">
              Your refill threshold: {item.low} {item.unit}
            </p>
            <div className="stock-controls">
              <Button
                variant="outline"
                disabled={item.stock === 0}
                onClick={() => a.stockChange(item.id, -1)}
              >
                Use 1
              </Button>
              <Button
                variant="ghost"
                onClick={() => a.setModal({ kind: "restock", supply: item })}
              >
                Restock
              </Button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
function Types() {
  const a = useApp();
  return (
    <div className="type-grid">
      {a.types.map((type) => (
        <article className="type-card" key={type.id}>
          <span className={`icon-well ${type.id}`}>
            <Icon name={type.icon} />
          </span>
          <h2>{type.name}</h2>
          <p>{type.description}</p>
          <div className="field-tags">
            {type.fields.map((f) => (
              <span key={f.id}>
                {f.label}
                {f.unit ? ` · ${f.unit}` : ""}
              </span>
            ))}
          </div>
          <button onClick={() => a.openRecord(type)}>
            Use this record type ↗
          </button>
        </article>
      ))}
    </div>
  );
}
function Modal() {
  const a = useApp(),
    modal = a.modal;
  const titles = {
    record: "A little moment to remember",
    type: "Build your own record",
    supply: "Add to the cupboard",
    restock: "Restock a supply",
    child: "Add a child",
  };
  return (
    <Dialog open={!!modal} onOpenChange={(open) => !open && a.setModal(null)}>
      <DialogPopup
        className="care-dialog"
        showCloseButton={false}
        bottomStickOnMobile={false}
        initialFocus={
          matchMedia("(pointer: coarse)").matches ? false : undefined
        }
      >
        <DialogHeader>
          <div className="dialog-heading">
            <DialogTitle>{modal ? titles[modal.kind] : ""}</DialogTitle>
            <button aria-label="Close dialog" onClick={() => a.setModal(null)}>
              ×
            </button>
          </div>
          <DialogDescription>
            {modal?.kind === "type"
              ? "Combine reusable fields to fit your routine."
              : modal?.kind === "record"
                ? `Recording for ${a.children.find((c) => c.id === modal.child)?.name}.`
                : "Your preferences, kept simple."}
          </DialogDescription>
        </DialogHeader>
        <SaveError />
        {modal?.kind === "record" && (
          <RecordForm
            key={modal.record?.id || modal.type.id}
            type={modal.type}
            record={modal.record}
            child={modal.child}
          />
        )}
        {modal?.kind === "type" && <TypeBuilder />}
        {(modal?.kind === "supply" || modal?.kind === "restock") && (
          <SupplyForm
            supply={modal.kind === "restock" ? modal.supply : undefined}
          />
        )}
        {modal?.kind === "child" && <ChildForm />}
      </DialogPopup>
    </Dialog>
  );
}
