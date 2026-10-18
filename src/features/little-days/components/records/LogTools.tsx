import { SegmentControl } from "@vita/ui/segment-control";
import { useI18n } from "../../i18n/useI18n";
import { Input } from "@vita/ui/input";
import { useApp } from "../../hooks/useApp";

export function LogTools() {
  const { tr } = useI18n();
  const a = useApp();
  return (
    <div className="log-tools">
      <SegmentControl
        className="segmented"
        variant="text"
        value={a.range}
        onValueChange={a.setRange}
        items={[
          { value: "today", label: tr("Today") },
          { value: "all", label: tr("All records") },
        ]}
      />
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
