import { useI18n } from "../../i18n/LocaleProvider";
import { Input } from "@vita/ui/input";
import { useApp } from "../../hooks/useApp";

export function LogTools() {
  const { tr } = useI18n();
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
            {tr(label)}
          </button>
        ))}
      </div>
      <Input
        nativeInput
        aria-label={tr("Search records")}
        type="search"
        placeholder={tr("Find a record…")}
        value={a.query}
        onChange={(e) => a.setQuery(e.target.value)}
      />
    </div>
  );
}
