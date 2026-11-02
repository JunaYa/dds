import { SegmentControl } from "@vita/ui/segment-control";
import { WeekDatePicker } from "@vita/ui/week-date-picker";
import { useI18n } from "../../i18n/useI18n";
import { useApp } from "../../hooks/useApp";

export function LogTools() {
  const { tr, locale } = useI18n();
  const a = useApp();
  return (
    <>
      <div className="log-tools">
        <SegmentControl
          className="segmented"
          variant="text"
          value={a.range}
          onValueChange={a.setRange}
          items={[
            { value: "today", label: tr("By date") },
            { value: "all", label: tr("All records") },
          ]}
        />
      </div>
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
          labels={{
            previousWeek: tr("Previous week"),
            nextWeek: tr("Next week"),
            today: tr("Today"),
            chooseDate: tr("Choose record date"),
          }}
        />
      </div>
    </>
  );
}
