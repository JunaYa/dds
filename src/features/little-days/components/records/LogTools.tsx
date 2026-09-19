import { Input } from "@vita/ui/input";
import { useApp } from "../../hooks/useApp";

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
