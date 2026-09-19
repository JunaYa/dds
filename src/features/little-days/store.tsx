import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  age,
  elapsedSeconds,
  localDateTime,
  today,
  type CareRecord,
  type Child,
  type RecordType,
  type Supply,
  type Workspace,
} from "./model";
import { loadWorkspace, saveWorkspace } from "./storage";
import {
  nursingSeconds,
  pauseOrResumeSession,
  switchNursingSide,
  type NursingSide,
} from "./nursing";

export type Page = "Today" | "Supplies" | "Record types";
type Modal =
  | {
      kind: "record";
      type: RecordType;
      record: CareRecord | null;
      child: string;
    }
  | { kind: "type" | "supply" | "child" }
  | { kind: "restock"; supply: Supply }
  | null;
function useWorkspaceState() {
  const [loaded] = useState(() => {
    try {
      return { ...loadWorkspace(), error: "" };
    } catch {
      return {
        raw: null,
        data: null,
        error:
          "Your saved data could not be opened. It has not been changed. Restore browser access or reload to try again.",
      };
    }
  });
  const [data, setData] = useState(loaded.data);
  const current = useRef(data);
  const raw = useRef(loaded.raw);
  const [error, setError] = useState(loaded.error);
  const [page, setPage] = useState<Page>("Today");
  const [range, setRange] = useState("today");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [nursingOpen, setNursingOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [removed, setRemoved] = useState<CareRecord | null>(null);
  const [day, setDay] = useState(today);
  useEffect(() => {
    const refresh = () => setDay(today());
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  function commit(change: (state: Workspace) => Workspace, message = "") {
    if (!current.current) return false;
    try {
      const next = change(current.current);
      raw.current = saveWorkspace(next, raw.current);
      current.current = next;
      setData(next);
      setError("");
      setNotice(message);
      setRemoved(null);
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message.includes("another window")
          ? cause.message
          : "Could not save. Check the entered values and available device storage, then try again.",
      );
      return false;
    }
  }
  const child = data?.child ?? "";
  const children = data?.children ?? [];
  const types = data?.types ?? [];
  const records = data?.records ?? [];
  const supplies = data?.supplies ?? [];
  const session = data?.session ?? null;
  const selected = children.find((c) => c.id === child);
  const activeChild = selected
    ? {
        ...selected,
        age: age(selected.birthday),
        initial: selected.name.slice(0, 1),
        caption: "The little moments, remembered.",
      }
    : null;
  const childRecords = records.filter((r) => r.child === child);
  const visible = childRecords
    .filter(
      (r) =>
        (range === "all" || r.time.startsWith(day)) &&
        `${types.find((t) => t.id === r.type)?.name} ${r.note} ${Object.values(r.values).join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => b.time.localeCompare(a.time));
  const openRecord = (type: RecordType, record: CareRecord | null = null) =>
    setModal({ kind: "record", type, record, child });
  function saveRecord(record: Omit<CareRecord, "id"> & { id?: string }) {
    const saved = { ...record, id: record.id || crypto.randomUUID() };
    const ok = commit(
      (s) => ({
        ...s,
        records: record.id
          ? s.records.map((r) => (r.id === record.id ? saved : r))
          : [saved, ...s.records],
      }),
      "Record saved",
    );
    if (ok) setModal(null);
    return ok;
  }
  function removeRecord(id: string) {
    const record = current.current?.records.find((r) => r.id === id);
    if (!record) return false;
    if (
      !commit(
        (s) => ({ ...s, records: s.records.filter((r) => r.id !== id) }),
        "Record removed",
      )
    )
      return false;
    setRemoved(record);
    return true;
  }
  function saveType(type: Omit<RecordType, "id" | "icon">) {
    if (
      commit(
        (s) => ({
          ...s,
          types: [
            ...s.types,
            { ...type, id: crypto.randomUUID(), icon: "spark" },
          ],
        }),
        "Custom record type added",
      )
    )
      setModal(null);
  }
  function saveChild(profile: Omit<Child, "id">) {
    if (profile.birthday > today()) {
      setError("Birthday cannot be in the future.");
      return;
    }
    const kid = { ...profile, id: crypto.randomUUID() };
    if (
      commit(
        (s) => ({ ...s, children: [...s.children, kid], child: kid.id }),
        "Child added",
      )
    )
      setModal(null);
  }
  function startSession(
    type: RecordType,
    nursing = false,
    sessionChild = child,
  ) {
    if (current.current?.session) {
      setNotice("Finish the active timer before starting another.");
      return false;
    }
    const now = Date.now();
    const saved = commit(
      (s) => ({
        ...s,
        session: {
          type: type.id,
          child: sessionChild,
          started: now,
          elapsed: 0,
          time: localDateTime(new Date(now)),
          ...(nursing && {
            nursing: {
              side: "left" as const,
              startedAt: new Date(now).toISOString(),
              left: 0,
              right: 0,
            },
          }),
        },
      }),
      `${type.name} timer started`,
    );
    if (saved && nursing) setNursingOpen(true);
    return saved;
  }
  function pauseSession() {
    return commit((s) => ({
      ...s,
      session: s.session ? pauseOrResumeSession(s.session) : null,
    }));
  }
  function changeNursingSide(side: NursingSide) {
    return commit((s) => ({
      ...s,
      session: s.session ? switchNursingSide(s.session, side) : null,
    }));
  }
  function editSessionTime(time: string) {
    const timestamp = new Date(time).getTime();
    if (!Number.isFinite(timestamp) || timestamp > Date.now()) return false;
    return commit((s) => ({
      ...s,
      session: s.session
        ? {
            ...s.session,
            time,
            ...(s.session.nursing && {
              nursing: {
                ...s.session.nursing,
                startedAt: new Date(timestamp).toISOString(),
              },
            }),
          }
        : null,
    }));
  }
  function discardSession() {
    const saved = commit((s) => ({ ...s, session: null }), "Timer discarded");
    if (saved) setNursingOpen(false);
    return saved;
  }
  function finishSession() {
    const saved = commit((s) => {
      if (!s.session) return s;
      const timer = s.types
        .find((t) => t.id === s.session?.type)
        ?.fields.find((f) => f.kind === "timer");
      if (!timer) throw new Error("Timer field missing");
      const now = Date.now();
      const sides = nursingSeconds(s.session, now);
      const total = s.session.nursing
        ? sides.left + sides.right
        : elapsedSeconds(s.session, now);
      const method = s.types
        .find((t) => t.id === s.session?.type)
        ?.fields.find(
          (f) =>
            f.kind === "choice" &&
            f.id === "method" &&
            f.options.split(",").some((option) => option.trim() === "Nursing"),
        );
      const record: CareRecord = {
        id: crypto.randomUUID(),
        child: s.session.child,
        type: s.session.type,
        time: s.session.time,
        values: {
          [timer.id]: Math.round(total / 6) / 10,
          ...(s.session.nursing && method && { [method.id]: "Nursing" }),
        },
        note: "",
        ...(s.session.nursing && {
          nursing: {
            startedAt: s.session.nursing.startedAt,
            endedAt: new Date(now).toISOString(),
            leftSeconds: sides.left,
            rightSeconds: sides.right,
          },
        }),
      };
      return { ...s, records: [record, ...s.records], session: null };
    }, "Timed record saved");
    if (saved) setNursingOpen(false);
    return saved;
  }
  function stockChange(id: string, delta: number) {
    return commit(
      (s) => ({
        ...s,
        supplies: s.supplies.map((item) =>
          item.id === id ? { ...item, stock: item.stock + delta } : item,
        ),
      }),
      "Stock updated",
    );
  }
  function addSupply(item: Omit<Supply, "id">) {
    if (
      commit(
        (s) => ({
          ...s,
          supplies: [...s.supplies, { ...item, id: crypto.randomUUID() }],
        }),
        "Supply added",
      )
    )
      setModal(null);
  }
  function undo() {
    if (removed)
      commit(
        (s) => ({ ...s, records: [...s.records, removed] }),
        "Record restored",
      );
  }
  return {
    data,
    error,
    day,
    children,
    types,
    records,
    supplies,
    child,
    setChild: (id: string) => commit((s) => ({ ...s, child: id })),
    activeChild,
    page,
    setPage,
    range,
    setRange,
    query,
    setQuery,
    modal,
    setModal,
    notice,
    visible,
    childRecords,
    openRecord,
    saveRecord,
    removeRecord,
    saveType,
    saveChild,
    session,
    startSession,
    pauseSession,
    finishSession,
    nursingOpen,
    setNursingOpen,
    changeNursingSide,
    editSessionTime,
    discardSession,
    stockChange,
    addSupply,
    undo: removed ? undo : null,
  };
}
const Store = createContext<ReturnType<typeof useWorkspaceState> | null>(null);
export function useApp() {
  const state = useContext(Store);
  if (!state) throw new Error("Little days requires WorkspaceProvider");
  return state;
}
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const state = useWorkspaceState();
  return <Store.Provider value={state}>{children}</Store.Provider>;
}
