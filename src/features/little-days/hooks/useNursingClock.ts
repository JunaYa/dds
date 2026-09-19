import { useEffect, useState } from "react";
import { type Session } from "../domain/model";

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
