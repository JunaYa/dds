import { useEffect, useState } from "react";
import type { Session } from "./model";
import { formatNursingTime } from "./nursing";

export function useNursingClock(session: Session | null, visible = true) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const refresh = () => {
      clearInterval(interval);
      setNow(Date.now());
      if (visible && !document.hidden && session?.started != null)
        interval = setInterval(() => setNow(Date.now()), 1000);
    };
    refresh();
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, [session, visible]);
  return now;
}

export function RollingTime({ seconds }: { seconds: number }) {
  const value = formatNursingTime(seconds);
  const [frame, setFrame] = useState({ value, previous: value });
  if (value !== frame.value) setFrame({ value, previous: frame.value });
  const previous = frame.previous
    .padStart(value.length, " ")
    .slice(-value.length);
  return (
    <>
      <span className="sr-only">{value}</span>
      <span className="nursing-rolling-time" aria-hidden="true">
        {[...value].map((digit, index) => {
          const old = previous[index];
          const changed = digit !== old && digit !== ":";
          return (
            <span
              className={`nursing-digit ${digit === ":" ? "nursing-colon" : ""}`}
              key={value.length - index}
            >
              <span
                key={`${digit}-${old}`}
                className={changed ? "nursing-digit-in" : undefined}
              >
                {digit}
              </span>
              {changed && (
                <span key={`old-${old}-${digit}`} className="nursing-digit-out">
                  {old}
                </span>
              )}
            </span>
          );
        })}
      </span>
    </>
  );
}
