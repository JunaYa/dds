import { useApp } from "../../hooks/useApp";
import { age } from "../../domain/model";

export function ChildPicker() {
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
