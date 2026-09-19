import { elapsedSeconds, type Session } from "./model";

export type NursingSide = "left" | "right";

export function nursingSeconds(session: Session, now = Date.now()) {
  const nursing = session.nursing;
  if (!nursing) return { left: 0, right: 0 };
  const live =
    session.started === null ? 0 : Math.max(0, (now - session.started) / 1000);
  return {
    left: nursing.left + (nursing.side === "left" ? live : 0),
    right: nursing.right + (nursing.side === "right" ? live : 0),
  };
}

export function pauseOrResumeSession(
  session: Session,
  now = Date.now(),
): Session {
  const nursing = session.nursing;
  const sides = nursingSeconds(session, now);
  return {
    ...session,
    started: session.started === null ? now : null,
    elapsed: nursing ? sides.left + sides.right : elapsedSeconds(session, now),
    ...(nursing && { nursing: { ...nursing, ...sides } }),
  };
}

export function switchNursingSide(
  session: Session,
  side: NursingSide,
  now = Date.now(),
): Session {
  if (!session.nursing || session.nursing.side === side) return session;
  const sides = nursingSeconds(session, now);
  return {
    ...session,
    started: session.started === null ? null : now,
    elapsed: sides.left + sides.right,
    nursing: { ...session.nursing, ...sides, side },
  };
}

export function formatNursingTime(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
