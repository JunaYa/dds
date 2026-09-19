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
import { localDateTime } from "./model";
import { useApp } from "./store";

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
            ? "今天"
            : date.toLocaleDateString("zh-CN", {
                month: "long",
                day: "numeric",
                weekday: "short",
              }),
      };
    });
  }, [anchorDate]);
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
          setError("开始时间不能晚于现在。");
          return;
        }
        if (a.editSessionTime(draft)) onClose();
      }}
    >
      <div className="nursing-sheet-handle" aria-hidden="true" />
      <header className="nursing-time-heading">
        <Button type="button" variant="ghost" onClick={onClose}>
          取消
        </Button>
        <DialogTitle>开始时间</DialogTitle>
        <Button type="submit" variant="ghost" aria-label="保存时间">
          完成
        </Button>
      </header>
      <DialogDescription className="sr-only">
        滚动选择日期、小时和分钟，或使用方向键调整。修改开始时间不会改变左右侧已计时的时长。
      </DialogDescription>
      {manual ? (
        <label className="nursing-manual-time form-field">
          开始时间
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
            label="开始日期"
            options={days}
            value={draft.slice(0, 10)}
            onChange={(value) => update("date", value)}
          />
          <TimeWheel
            label="开始小时"
            options={hours}
            value={draft.slice(11, 13)}
            onChange={(value) => update("hour", value)}
          />
          <TimeWheel
            label="开始分钟"
            options={minutes}
            value={draft.slice(14, 16)}
            onChange={(value) => update("minute", value)}
          />
        </div>
      )}
      {(error || a.error) && (
        <p className="nursing-dialog-error" role="alert">
          {error || a.error}
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
        {manual ? "滚动选择时间" : "手动输入时间"}
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
