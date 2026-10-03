import { typeName } from "../../i18n/record-labels";
import { useI18n } from "../../i18n/useI18n";
import { useEffect, useState } from "react";
import { Button } from "@vita/ui/button";
import { useApp } from "../../hooks/useApp";
import { elapsedSeconds, formatTimer } from "../../domain/model";
import { Icon } from "../common/Icon";

export function SessionBanner() {
  const { tr } = useI18n();
  const a = useApp();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!a.session || a.session.nursing) return;
    const refresh = () => setNow(Date.now());
    refresh();
    const id = setInterval(refresh, 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [a.session]);
  if (!a.session || a.session.nursing) return null;
  const session = a.session,
    type = a.types.find((t) => t.id === session.type),
    kid = a.children.find((c) => c.id === session.child);
  return (
    <section className="session-banner">
      <Icon name={type?.icon} />
      <div>
        <strong>
          {kid?.name} · {type ? typeName(type, tr) : ""}
        </strong>
        <span>
          {session.started === null ? tr("Paused") : tr("Timer running")}
        </span>
      </div>
      <output aria-label={tr("Elapsed time")}>
        {formatTimer(elapsedSeconds(session, now))}
      </output>
      <Button unstyled onClick={a.pauseSession}>
        {session.started === null ? tr("Resume") : tr("Pause")}
      </Button>
      <Button variant="outline" onClick={a.finishSession}>
        {tr("Finish & save")}
      </Button>
    </section>
  );
}
