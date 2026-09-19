import { useEffect, useState } from 'react';
import { Button } from '@vita/ui/button';
import { Icons } from '@vita/ui/icons';
import { useJournal } from './journal-context';
import type { FeedingTimer, JournalRecord } from './model';

export function formatDuration(milliseconds: number) {
  const seconds = Number.isFinite(milliseconds)
    ? Math.max(0, Math.floor(milliseconds / 1000))
    : 0;
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

export function ElapsedTime({ startedAt, endedAt }: { startedAt: string; endedAt?: string }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (endedAt !== undefined) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    function refresh() {
      clearInterval(interval);
      setNow(Date.now());
      if (!document.hidden) interval = setInterval(() => setNow(Date.now()), 1000);
    }
    refresh();
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('pageshow', refresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('pageshow', refresh);
    };
  }, [startedAt, endedAt]);
  const duration =
    (endedAt === undefined ? now : Date.parse(endedAt)) - Date.parse(startedAt);
  return (
    <span
      role="timer"
      aria-label="已用时间"
      aria-live="off"
      className="font-mono tabular-nums"
    >
      {formatDuration(duration)}
    </span>
  );
}

export function FeedingTimerBanner({ onOpen }: { onOpen: () => void }) {
  const { state } = useJournal();
  const timer = state.feedingTimer;
  if (!timer) return null;
  return (
    <section
      aria-label="哺乳计时"
      className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border bg-muted/40 p-4"
    >
      <Icons.timer className="size-5 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {timer.endedAt ? '哺乳计时已结束，待保存' : '哺乳计时中'}
        </p>
        <div className="mt-1 text-sm text-muted-foreground">
          <ElapsedTime startedAt={timer.startedAt} endedAt={timer.endedAt} />
        </div>
      </div>
      <Button variant="outline" onClick={onOpen}>
        {timer.endedAt ? '补充并保存' : '继续计时记录'}
      </Button>
    </section>
  );
}

export function FeedingTimerControl({
  timer,
  values,
  hasExisting,
  stale,
  onStart,
  onStop,
  onDiscard,
}: {
  timer: FeedingTimer | null;
  values: JournalRecord['values'];
  hasExisting: boolean;
  stale: boolean;
  onStart: () => void;
  onStop: () => void;
  onDiscard: () => void;
}) {
  const { busy } = useJournal();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const running = timer && !timer.endedAt;
  return (
    <section
      aria-label="本次哺乳计时"
      className="space-y-3 rounded-xl border bg-muted/40 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium" aria-live="polite">
          {running ? '正在计时' : timer ? '本次用时' : '哺乳计时'}
        </p>
        {timer && (
          <div className="text-2xl">
            <ElapsedTime
              startedAt={running ? timer.startedAt : String(values.startedAt)}
              endedAt={running ? undefined : String(values.endedAt)}
            />
          </div>
        )}
      </div>
      {stale ? (
        <p role="alert" className="text-sm text-destructive">
          计时状态已改变，请关闭表单后重新打开。
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {!timer && (
              <Button type="button" variant="primary" disabled={busy} onClick={onStart}>
                <Icons.timer />
                {hasExisting ? '继续已有计时' : '开始计时'}
              </Button>
            )}
            {running && (
              <Button type="button" variant="primary" disabled={busy} onClick={onStop}>
                <Icons.check />
                结束计时
              </Button>
            )}
            {timer && !confirmDiscard && (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => setConfirmDiscard(true)}
              >
                放弃本次计时
              </Button>
            )}
          </div>
          {confirmDiscard && timer && (
            <div className="space-y-2">
              <p className="text-sm">放弃后将清除本次计时，不会生成记录。</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setConfirmDiscard(false)}
                >
                  保留计时
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy}
                  onClick={onDiscard}
                >
                  确认放弃
                </Button>
              </div>
            </div>
          )}
          <p className="text-xs leading-5 text-muted-foreground">
            {running
              ? '可以关闭表单或切到后台，计时会保留。结束后再填写喂养量并保存。'
              : timer
                ? '起止时间已保留，也可以手动调整。补充喂养量后保存为记录。'
                : '点击开始、结束即可记录时间，也可以在下方手动填写。'}
          </p>
        </>
      )}
    </section>
  );
}
