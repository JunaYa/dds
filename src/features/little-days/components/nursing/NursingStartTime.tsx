import { WheelPicker } from "@vita/ui/wheel-picker";
import { DateTimePicker } from "@vita/ui/date-time-picker";
import { useI18n } from "../../i18n/useI18n";
import { useId, useMemo, useState } from "react";
import { Button } from "@vita/ui/button";
import {
  Dialog,
  DialogPortal,
  DialogBackdrop,
  DialogViewport,
  DialogPrimitive,
  DialogTitle,
  DialogDescription,
} from "@vita/ui/dialog";
import { localDateTime } from "../../domain/model";
import { useApp } from "../../hooks/useApp";

const hours = Array.from({ length: 24 }, (_, value) => ({
  value: String(value).padStart(2, "0"),
  label: String(value).padStart(2, "0"),
}));
const minutes = Array.from({ length: 60 }, (_, value) => ({
  value: String(value).padStart(2, "0"),
  label: String(value).padStart(2, "0"),
}));
function StartTimeForm({
  time,
  onClose,
}: {
  time: string;
  onClose: () => void;
}) {
  const { tr, locale } = useI18n();
  const dateInputId = useId();
  const a = useApp();
  const [draft, setDraft] = useState(time);
  const [anchorDate, setAnchorDate] = useState(time.slice(0, 10));
  const [manual, setManual] = useState(false);
  const [error, setError] = useState("");
  const days = useMemo(() => {
    const end = new Date(`${anchorDate}T12:00`);
    end.setDate(end.getDate() + 15);
    const today = new Date();
    const last = end > today ? today : end;
    return Array.from({ length: 31 }, (_, i) => {
      const date = new Date(last);
      date.setDate(date.getDate() - (30 - i));
      const value = localDateTime(date).slice(0, 10);
      return {
        value,
        label:
          value === localDateTime(today).slice(0, 10)
            ? tr("Today")
            : date.toLocaleDateString(locale, {
                month: "long",
                day: "numeric",
                weekday: "short",
              }),
      };
    });
  }, [anchorDate, locale, tr]);
  const update = (part: "date" | "hour" | "minute", value: string) => {
    setError("");
    setDraft((current) =>
      part === "date"
        ? `${value}${current.slice(10)}`
        : part === "hour"
          ? `${current.slice(0, 11)}${value}${current.slice(13)}`
          : `${current.slice(0, 14)}${value}`,
    );
  };
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (
          !draft ||
          !Number.isFinite(new Date(draft).getTime()) ||
          new Date(draft).getTime() > Date.now()
        ) {
          setError("Start time cannot be in the future.");
          return;
        }
        if (a.editSessionTime(draft)) onClose();
      }}
    >
      <div className="nursing-sheet-handle" aria-hidden="true" />
      <header className="nursing-time-heading">
        <Button type="button" variant="ghost" onClick={onClose}>
          {tr("Cancel")}
        </Button>
        <DialogTitle>{tr("Start time")}</DialogTitle>
        <Button type="submit" variant="ghost" aria-label={tr("Save time")}>
          {tr("Done")}
        </Button>
      </header>
      <DialogDescription className="sr-only">
        {tr(
          "Scroll to choose the date, hour, and minute, or use arrow keys. Changing the start time does not change the timed duration for either side.",
        )}
      </DialogDescription>
      {manual ? (
        <div className="nursing-manual-time form-field">
          <label htmlFor={dateInputId}>{tr("Start time")}</label>
          <DateTimePicker
            id={dateInputId}
            locale={locale}
            required
            max={localDateTime()}
            value={draft}
            onValueChange={(value) => {
              setDraft(value);
              setError("");
              if (value) setAnchorDate(value.slice(0, 10));
            }}
            aria-invalid={!!error}
          />
        </div>
      ) : (
        <div className="nursing-time-wheels">
          <WheelPicker
            label={tr("Start date")}
            options={days}
            value={draft.slice(0, 10)}
            onValueChange={(value) => update("date", value)}
          />
          <WheelPicker
            label={tr("Start hour")}
            options={hours}
            value={draft.slice(11, 13)}
            onValueChange={(value) => update("hour", value)}
          />
          <WheelPicker
            label={tr("Start minute")}
            options={minutes}
            value={draft.slice(14, 16)}
            onValueChange={(value) => update("minute", value)}
          />
        </div>
      )}
      {(error || a.error) && (
        <p className="nursing-dialog-error" role="alert">
          {tr(error || a.error)}
        </p>
      )}
      <Button
        className="nursing-manual-toggle"
        type="button"
        variant="ghost"
        onClick={() => {
          if (!draft || !Number.isFinite(new Date(draft).getTime())) {
            setDraft(time);
            setAnchorDate(time.slice(0, 10));
          }
          setManual((value) => !value);
        }}
      >
        {manual ? tr("Choose time with wheels") : tr("Enter time manually")}
      </Button>
    </form>
  );
}

export function NursingStartTime({
  open,
  onOpenChange,
  time,
  theme,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  time: string;
  theme: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop className="nursing-time-backdrop" />
        <DialogViewport className="nursing-time-viewport">
          <DialogPrimitive.Popup
            className={`nursing-confirm nursing-time-sheet ${theme}`}
          >
            <StartTimeForm time={time} onClose={() => onOpenChange(false)} />
          </DialogPrimitive.Popup>
        </DialogViewport>
      </DialogPortal>
    </Dialog>
  );
}
