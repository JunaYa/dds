import { useI18n } from "../../i18n/LocaleProvider";
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
  const { tr, locale } = useI18n();
  const a = useApp();
  const { resolved } = useTheme();
  const [nightMode, setNightMode] = useState<boolean | null>(null);
  const dark = nightMode ?? resolved === "dark";
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
            lang={locale}
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
                  aria-label={tr("Minimize nursing timer")}
                  onClick={() => a.setNursingOpen(false)}
                >
                  <Icons.chevronDown aria-hidden="true" />
                </Button>
                <div className="nursing-toolbar-actions">
                  <Button
                    variant="secondary"
                    size="icon-lg"
                    className="nursing-circle nursing-delete"
                    aria-label={tr("Discard this nursing session")}
                    onClick={() => setDiscardOpen(true)}
                  >
                    <Icons.trash aria-hidden="true" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon-lg"
                    className="nursing-circle"
                    aria-label={tr("Night mode")}
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
                      {tr(
                        paused
                          ? nursing.side === "left"
                            ? "Left-side nursing paused"
                            : "Right-side nursing paused"
                          : nursing.side === "left"
                            ? "Nursing on the left"
                            : "Nursing on the right",
                      )}
                    </span>
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    {tr(
                      "Recording nursing for {name}. The timer continues when minimized. Finish to save the record.",
                      { name: kid?.name ?? "" },
                    )}
                  </DialogDescription>
                </div>
                {a.error && (
                  <p className="nursing-error" role="alert">
                    {tr(a.error)}
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
                  <AlertDialogTitle>
                    {tr("Discard this nursing session?")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {tr(
                      "This timer will not be saved. Previously saved records are not affected.",
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {a.error && (
                  <p className="nursing-dialog-error" role="alert">
                    {tr(a.error)}
                  </p>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel>{tr("Keep timer")}</AlertDialogCancel>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (a.discardSession()) setDiscardOpen(false);
                    }}
                  >
                    {tr("Discard timer")}
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
  const { tr } = useI18n();
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
      aria-label={tr(
        side === "left" ? "Left-side nursing" : "Right-side nursing",
      )}
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
          aria-label={tr("Current side duration")}
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
          aria-label={tr("Edit start time")}
          onClick={onEdit}
        >
          <Icons.timer aria-hidden="true" />
          <span className="nursing-stat-value">
            {session.time.slice(11, 16)}
            <Icons.edit aria-hidden="true" />
          </span>
          <span className="nursing-stat-label">{tr("Start")}</span>
        </Button>
        <div className="nursing-stat">
          <Icons.clock aria-hidden="true" />
          <output
            className="nursing-stat-value"
            aria-label={tr("Total duration")}
            aria-live="off"
          >
            <RollingTime seconds={sides.left + sides.right} />
          </output>
          <span className="nursing-stat-label">{tr("Total")}</span>
        </div>
        <div className="nursing-stat">
          <NursingSymbol mirrored={other === "right"} />
          <output
            className="nursing-stat-value"
            aria-label={tr(
              other === "left" ? "Left duration" : "Right duration",
            )}
            aria-live="off"
          >
            <RollingTime seconds={sides[other]} />
          </output>
          <span className="nursing-stat-label">
            {tr(other === "left" ? "Left" : "Right")}
          </span>
        </div>
      </div>
      <div className="nursing-actions">
        <Button
          variant="secondary"
          size="icon-xl"
          className="nursing-circle"
          aria-label={tr("Switch sides")}
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
            {paused ? tr("Resume") : tr("Pause")}
          </span>
        </Button>
        <Button
          variant="secondary"
          size="icon-xl"
          className="nursing-circle"
          aria-label={tr("Finish and save nursing")}
          onClick={a.finishSession}
        >
          <Icons.square aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
