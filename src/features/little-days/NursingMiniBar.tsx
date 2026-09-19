import { Button } from "@vita/ui/button";
import { Icons } from "@vita/ui/icons";
import { useApp } from "./store";
import { NursingSymbol } from "./NursingSymbol";
import { RollingTime, useNursingClock } from "./nursing-motion";
import { nursingSeconds } from "./nursing";

export function NursingMiniBar() {
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
      aria-label="亲喂计时"
      aria-hidden={a.nursingOpen}
      data-expanded={a.nursingOpen || undefined}
      inert={a.nursingOpen}
    >
      <Button
        variant="ghost"
        className="nursing-mini-open"
        aria-label="打开亲喂计时"
        onClick={() => a.setNursingOpen(true)}
      >
        <NursingSymbol mirrored={side === "right"} />
        <span className="nursing-mini-copy">
          <output aria-live="off" aria-label="累计亲喂时长">
            <RollingTime seconds={seconds.left + seconds.right} />
          </output>
          <span>
            {a.children.find((child) => child.id === session.child)?.name} ·{" "}
            {paused ? "已暂停" : "亲喂中"}
          </span>
        </span>
      </Button>
      <span className="nursing-mini-side">
        {side === "left" ? "左侧" : "右侧"}
      </span>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label="切换左右侧"
        onClick={() => a.changeNursingSide(side === "left" ? "right" : "left")}
      >
        <Icons.arrowRightLeft aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label={paused ? "继续亲喂计时" : "暂停亲喂计时"}
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
