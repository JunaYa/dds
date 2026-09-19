import { useTheme } from "../../hooks/useTheme";
import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@vita/ui/button";
import { Icons } from "@vita/ui/icons";
import {
  Dialog,
  DialogPortal,
  DialogPrimitive,
  DialogViewport,
  DialogBackdrop,
  DialogTitle,
  DialogDescription,
} from "@vita/ui/dialog";
import {
  AlertDialog,
  AlertDialogPopup,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@vita/ui/alert-dialog";
import { useApp } from "../../hooks/useApp";
import { type Session } from "../../domain/model";
import { NursingSymbol } from "./NursingSymbol";
import { RollingTime } from "./RollingTime";
import { useNursingClock } from "../../hooks/useNursingClock";
import { NursingStartTime } from "./NursingStartTime";
import { nursingSeconds, type NursingSide } from "../../domain/nursing";

export function NursingTimer() {
  const a = useApp();
  const { resolved } = useTheme();
  const [nightMode, setNightMode] = useState<boolean | null>(null);
  const dark = nightMode ?? (resolved === "dark");
  const [discardOpen, setDiscardOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [instant, setInstant] = useState(false);
  const lastSession = useRef<Session | null>(null);
  const session = a.session?.nursing ? a.session : lastSession.current;
  const open = !!a.session?.nursing && a.nursingOpen;

  useLayoutEffect(() => {
    if (a.session?.nursing) lastSession.current = a.session;
  }, [a.session]);
  useLayoutEffect(() => {
    if (open) setInstant(!!document.activeElement?.matches(":focus-visible"));
  }, [open]);

  if (!session?.nursing) return null;
  const nursing = session.nursing;
  const paused = session.started === null;
  const kid = a.children.find((c) => c.id === session.child);
  const theme = dark ? "dark" : "light";

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => a.setNursingOpen(value)}
      onOpenChangeComplete={(value) => {
        if (!value) setInstant(false);
        if (!value && !a.session?.nursing) lastSession.current = null;
      }}
    >
      <DialogPortal>
        <DialogBackdrop
          className="nursing-backdrop"
          data-instant={instant || undefined}
        />
        <DialogViewport className={`nursing-viewport ${theme}`}>
          <DialogPrimitive.Popup
            className="nursing-screen"
            lang="zh-CN"
            data-instant={instant || undefined}
            onKeyDownCapture={() => setInstant(true)}
            onPointerDownCapture={() => setInstant(false)}
            finalFocus={() =>
              document.querySelector<HTMLElement>(".nursing-mini-open") ??
              document.querySelector<HTMLElement>(".nursing-entry button")
            }
          >
            <div className="nursing-frame">
              <header className="nursing-toolbar">
                <Button
                  variant="secondary"
                  size="icon-lg"
                  className="nursing-circle"
                  aria-label="收起亲喂计时"
                  onClick={() => a.setNursingOpen(false)}
                >
                  <Icons.chevronDown aria-hidden="true" />
                </Button>
                <div className="nursing-toolbar-actions">
                  <Button
                    variant="secondary"
                    size="icon-lg"
                    className="nursing-circle nursing-delete"
                    aria-label="丢弃本次亲喂"
                    onClick={() => setDiscardOpen(true)}
                  >
                    <Icons.trash aria-hidden="true" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon-lg"
                    className="nursing-circle"
                    aria-label="夜间模式"
                    aria-pressed={dark}
                    onClick={() => setNightMode(!dark)}
                  >
                    {dark ? (
                      <Icons.sun aria-hidden="true" />
                    ) : (
                      <Icons.moon aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </header>

              <div className="nursing-stage">
                <div className="nursing-status">
                  <div className="nursing-portrait" data-side={nursing.side}>
                    <NursingSymbol />
                  </div>
                  <DialogTitle className="nursing-title" aria-live="polite">
                    <span
                      className="nursing-status-text"
                      key={`${nursing.side}-${paused}`}
                    >
                      {nursing.side === "left" ? "左" : "右"}侧亲喂
                      {paused ? "已暂停" : "中"}
                    </span>
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    正在为 {kid?.name}{" "}
                    记录亲喂。收起后计时会继续，结束时保存记录。
                  </DialogDescription>
                </div>
                {a.error && (
                  <p className="nursing-error" role="alert">
                    {a.error}
                  </p>
                )}
              </div>

              <NursingControls
                session={session}
                active={open}
                onEdit={() => setEditOpen(true)}
              />
            </div>

            <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
              <AlertDialogPopup
                className={`nursing-confirm ${theme}`}
                bottomStickOnMobile={false}
              >
                <AlertDialogHeader>
                  <AlertDialogTitle>丢弃这次亲喂？</AlertDialogTitle>
                  <AlertDialogDescription>
                    本次计时不会保存为记录。已保存的记录不受影响。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {a.error && (
                  <p className="nursing-dialog-error" role="alert">
                    {a.error}
                  </p>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel>保留计时</AlertDialogCancel>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (a.discardSession()) setDiscardOpen(false);
                    }}
                  >
                    丢弃计时
                  </Button>
                </AlertDialogFooter>
              </AlertDialogPopup>
            </AlertDialog>

            <NursingStartTime
              open={editOpen}
              onOpenChange={setEditOpen}
              time={session.time}
              theme={theme}
            />
          </DialogPrimitive.Popup>
        </DialogViewport>
      </DialogPortal>
    </Dialog>
  );
}

function NursingControls({
  session,
  active,
  onEdit,
}: {
  session: Session;
  active: boolean;
  onEdit: () => void;
}) {
  const a = useApp();
  const now = useNursingClock(session, active);
  const nursing = session.nursing!;
  const sides = nursingSeconds(session, now);
  const other = nursing.side === "left" ? "right" : "left";
  const paused = session.started === null;
  const sideButton = (side: NursingSide) => (
    <Button
      variant="secondary"
      size="icon-xl"
      className="nursing-circle nursing-side"
      aria-label={`${side === "left" ? "左" : "右"}侧亲喂`}
      aria-pressed={nursing.side === side}
      onClick={() => a.changeNursingSide(side)}
    >
      <NursingSymbol mirrored={side === "right"} />
    </Button>
  );

  return (
    <div className="nursing-controls">
      <div className="nursing-timer-row">
        {sideButton("left")}
        <output
          className="nursing-digits"
          role="timer"
          aria-live="off"
          aria-label="当前侧时长"
          data-long={sides[nursing.side] >= 6000 || undefined}
        >
          <RollingTime seconds={sides[nursing.side]} />
        </output>
        {sideButton("right")}
      </div>
      <div className="nursing-stats">
        <Button
          variant="ghost"
          className="nursing-stat nursing-start"
          aria-label="修改开始时间"
          onClick={onEdit}
        >
          <Icons.timer aria-hidden="true" />
          <span className="nursing-stat-value">
            {session.time.slice(11, 16)}
            <Icons.edit aria-hidden="true" />
          </span>
          <span className="nursing-stat-label">开始</span>
        </Button>
        <div className="nursing-stat">
          <Icons.clock aria-hidden="true" />
          <output
            className="nursing-stat-value"
            aria-label="总计时长"
            aria-live="off"
          >
            <RollingTime seconds={sides.left + sides.right} />
          </output>
          <span className="nursing-stat-label">总计</span>
        </div>
        <div className="nursing-stat">
          <NursingSymbol mirrored={other === "right"} />
          <output
            className="nursing-stat-value"
            aria-label={`${other === "left" ? "左" : "右"}侧时长`}
            aria-live="off"
          >
            <RollingTime seconds={sides[other]} />
          </output>
          <span className="nursing-stat-label">
            {other === "left" ? "左" : "右"}侧
          </span>
        </div>
      </div>
      <div className="nursing-actions">
        <Button
          variant="secondary"
          size="icon-xl"
          className="nursing-circle"
          aria-label="切换左右侧"
          onClick={() => a.changeNursingSide(other)}
        >
          <Icons.arrowRightLeft aria-hidden="true" />
        </Button>
        <Button
          variant="primary"
          className="nursing-pause"
          onClick={a.pauseSession}
        >
          <span
            className="nursing-action-text"
            key={paused ? "resume" : "pause"}
          >
            {paused ? "继续" : "暂停"}
          </span>
        </Button>
        <Button
          variant="secondary"
          size="icon-xl"
          className="nursing-circle"
          aria-label="结束并保存亲喂"
          onClick={a.finishSession}
        >
          <Icons.square aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
