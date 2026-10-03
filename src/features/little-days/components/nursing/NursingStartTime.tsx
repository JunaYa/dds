import { useI18n } from "../../i18n/useI18n";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@vita/ui/button";
import { Input } from "@vita/ui/input";
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

type WheelOption = { value: string; label: string };
const hours = Array.from({ length: 24 }, (_, value) => ({
  value: String(value).padStart(2, "0"),
  label: String(value).padStart(2, "0"),
}));
const minutes = Array.from({ length: 60 }, (_, value) => ({
  value: String(value).padStart(2, "0"),
  label: String(value).padStart(2, "0"),
}));
const rowHeight = 32;

function TimeWheel({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: WheelOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const position = useRef(-1);
  const index = Math.max(
    0,
    options.findIndex((item) => item.value === value),
  );
  useLayoutEffect(() => {
    if (ref.current && position.current !== index) {
      ref.current.scrollTop = index * rowHeight;
      position.current = index;
    }
  }, [index, options]);
  return (
    <div
      ref={ref}
      className="nursing-time-wheel"
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuenow={index}
      aria-valuemin={0}
      aria-valuemax={options.length - 1}
      aria-valuetext={options[index].label}
      onScroll={(event) => {
        const next = Math.max(
          0,
          Math.min(
            options.length - 1,
            Math.round(event.currentTarget.scrollTop / rowHeight),
          ),
        );
        if (position.current !== next) {
          position.current = next;
          onChange(options[next].value);
        }
      }}
      onKeyDown={(event) => {
        const change = { ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5 }[
          event.key
        ];
        if (change === undefined && event.key !== "Home" && event.key !== "End")
          return;
        event.preventDefault();
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? options.length - 1
              : Math.max(
                  0,
                  Math.min(options.length - 1, index + (change ?? 0)),
                );
        onChange(options[next].value);
      }}
    >
      {options.map((option) => (
        <div
          className="nursing-wheel-option"
          key={option.value}
          aria-hidden="true"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </div>
      ))}
    </div>
  );
}

function StartTimeForm({
  time,
  onClose,
}: {
  time: string;
  onClose: () => void;
}) {
  const { tr, locale } = useI18n();
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
        <label className="nursing-manual-time form-field">
          {tr("Start time")}
          <Input
            nativeInput
            type="datetime-local"
            required
            max={localDateTime()}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setError("");
              if (event.target.value)
                setAnchorDate(event.target.value.slice(0, 10));
            }}
            aria-invalid={!!error}
          />
        </label>
      ) : (
        <div className="nursing-time-wheels">
          <TimeWheel
            label={tr("Start date")}
            options={days}
            value={draft.slice(0, 10)}
            onChange={(value) => update("date", value)}
          />
          <TimeWheel
            label={tr("Start hour")}
            options={hours}
            value={draft.slice(11, 13)}
            onChange={(value) => update("hour", value)}
          />
          <TimeWheel
            label={tr("Start minute")}
            options={minutes}
            value={draft.slice(14, 16)}
            onChange={(value) => update("minute", value)}
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
