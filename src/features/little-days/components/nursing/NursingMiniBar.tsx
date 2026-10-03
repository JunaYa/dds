import { useI18n } from "../../i18n/useI18n";
import { Button } from "@vita/ui/button";
import { Icons } from "@vita/ui/icons";
import { useApp } from "../../hooks/useApp";
import { NursingSymbol } from "./NursingSymbol";
import { RollingTime } from "./RollingTime";
import { useNursingClock } from "../../hooks/useNursingClock";
import { nursingSeconds } from "../../domain/nursing";

export function NursingMiniBar() {
  const { tr } = useI18n();
  const a = useApp();
  const now = useNursingClock(a.session, !a.nursingOpen);
  if (!a.session?.nursing) return null;
  const session = a.session;
  const side = session.nursing!.side;
  const seconds = nursingSeconds(session, now);
  const paused = session.started === null;
  return (
    <section
      className="nursing-minibar"
      aria-label={tr("Nursing timer")}
      aria-hidden={a.nursingOpen}
      data-expanded={a.nursingOpen || undefined}
      inert={a.nursingOpen}
    >
      <Button
        variant="ghost"
        className="nursing-mini-open"
        aria-label={tr("Open nursing timer")}
        onClick={() => a.setNursingOpen(true)}
      >
        <NursingSymbol mirrored={side === "right"} />
        <span className="nursing-mini-copy">
          <output aria-live="off" aria-label={tr("Total nursing time")}>
            <RollingTime seconds={seconds.left + seconds.right} />
          </output>
          <span>
            {a.children.find((child) => child.id === session.child)?.name} ·{" "}
            {paused ? tr("Paused") : tr("Nursing in progress")}
          </span>
        </span>
      </Button>
      <span className="nursing-mini-side">
        {side === "left" ? tr("Left") : tr("Right")}
      </span>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label={tr("Switch sides")}
        onClick={() => a.changeNursingSide(side === "left" ? "right" : "left")}
      >
        <Icons.arrowRightLeft aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label={
          paused ? tr("Resume nursing timer") : tr("Pause nursing timer")
        }
        onClick={a.pauseSession}
      >
        <span
          className="nursing-playback-icon"
          data-paused={paused || undefined}
        >
          <Icons.pause aria-hidden="true" />
          <Icons.play aria-hidden="true" />
        </span>
      </Button>
    </section>
  );
}
