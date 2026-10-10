import { elapsedSeconds, type CareRecord, type Session } from "../domain/model";

export type NightSignal = "neutral" | "green" | "yellow" | "red";
export type NightMetric = {
  elapsed: number | null;
  typical: number | null;
  samples: number;
  signal: NightSignal;
  paused: boolean;
};
const minute = 60_000;
const day = 24 * 60 * minute;
export const isNight = (date: Date) => date.getHours() >= 19 || date.getHours() < 7;

function metric(elapsed: number | null, samples: number[], paused = false): NightMetric {
  const sorted = samples.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const typical = sorted.length >= 3 && sorted.at(-1)! <= sorted[0] * 2 ? median : null;
  const signal = elapsed === null || typical === null || paused ? "neutral"
    : elapsed >= typical ? "red" : elapsed >= typical * 0.8 ? "yellow" : "green";
  return { elapsed, typical, samples: sorted.length, signal, paused };
}

export function nightStatus(records: CareRecord[], session: Session | null, child: string, now: Date) {
  const current = now.getTime();
  const recent = records.filter((r) => r.child === child &&
    Date.parse(r.time) <= current && Date.parse(r.time) >= current - 7 * day)
    .sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
  const active = session?.child === child && Date.parse(session.time) <= current ? session : null;
  const sleeping = active?.type === "sleep" ? active : null;
  const sleepMinutes = sleeping ? elapsedSeconds(sleeping, current) / 60 : null;
  const sleepSamples = sleeping ? recent.filter((r) => r.type === "sleep" &&
    isNight(new Date(r.time)) === isNight(new Date(sleeping.time)) &&
    typeof r.values.duration === "number" &&
    Date.parse(r.time) + r.values.duration * minute <= current)
    .map((r) => Number(r.values.duration)) : [];
  const sleep = metric(sleepMinutes, sleepSamples, sleeping?.started === null);
  const feeds = recent.filter((r) => r.type === "feed");
  const lastFeed = feeds.at(-1);
  const milk = (r: CareRecord) => r.values.method === "Bottle" || r.values.method === "Nursing" || !!r.nursing;
  const feedMinutes = lastFeed ? (current - Date.parse(lastFeed.time)) / minute : null;
  const intervals: number[] = [];
  if (lastFeed && milk(lastFeed) && feedMinutes! < 24 * 60 && active?.type !== "feed") {
    for (let i = 1; i < feeds.length; i++) {
      const previous = feeds[i - 1], next = feeds[i];
      const interval = (Date.parse(next.time) - Date.parse(previous.time)) / minute;
      if (milk(previous) && milk(next) && interval > 0 && interval < 24 * 60 &&
          isNight(new Date(previous.time)) === isNight(new Date(lastFeed.time))) intervals.push(interval);
    }
  }
  const feed = metric(feedMinutes, intervals, active?.type === "feed");
  const signals: NightSignal[] = ["neutral", "green", "yellow", "red"];
  const signal = signals[Math.max(signals.indexOf(sleep.signal), signals.indexOf(feed.signal))];
  return { sleep, feed, signal };
}
