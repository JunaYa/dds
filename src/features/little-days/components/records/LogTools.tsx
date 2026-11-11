import { SegmentControl } from "@vita/ui/segment-control";
import { Icons } from "@vita/ui/icons";
import { WeekDatePicker } from "@vita/ui/week-date-picker";
import { useI18n } from "../../i18n/useI18n";
import { useApp } from "../../hooks/useApp";

export function LogTools() {
  const { tr, locale } = useI18n();
  const a = useApp();
  return (
    <div className="journal-week">
      <WeekDatePicker
        value={a.recordDay}
        today={a.day}
        selected={a.range !== "all"}
        locale={locale}
        onValueChange={(value) => {
          a.setRecordDay(value === a.day ? null : value);
          a.setRange("today");
        }}
        labels={{ chooseDate: tr("Choose record date") }}
        headerEnd={<SegmentControl
          className="record-range"
          variant="icon"
          size="lg"
          value={a.range}
          onValueChange={a.setRange}
          items={[
            { value: "today", label: tr("By date"), icon: <Icons.calendar aria-hidden="true" /> },
            { value: "all", label: tr("All records"), icon: <Icons.list aria-hidden="true" /> },
          ]}
        />}
      />
    </div>
  );
}
