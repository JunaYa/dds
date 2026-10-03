import { useI18n } from "../../i18n/LocaleProvider";
import { useApp } from "../../hooks/useApp";
import { age } from "../../domain/model";

export function ChildPicker() {
  const { tr } = useI18n();
  const a = useApp();
  return (
    <div className="child-picker">
      <span className="avatar">{a.activeChild?.initial}</span>
      <label>
        <small>{tr("RECORDING FOR")}</small>
        <select
          aria-label={tr("Child")}
          value={a.child}
          onChange={(e) => a.setChild(e.target.value)}
        >
          {a.children.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {age(c.birthday, new Date(), tr)}
            </option>
          ))}
        </select>
      </label>
      <button
        className="add-child"
        aria-label={tr("Add child")}
        onClick={() => a.setModal({ kind: "child" })}
      >
        ＋
      </button>
    </div>
  );
}
