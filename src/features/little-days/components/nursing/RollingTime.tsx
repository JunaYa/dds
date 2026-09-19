import { useState } from "react";
import { formatNursingTime } from "../../domain/nursing";

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
