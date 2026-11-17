import { projectedPosition } from "./clock";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { audioBackend } from "./backend";
import { emptyState, type AudioCommand, type AudioState } from "./model";
const Context = createContext<{ state: AudioState; send: (command: AudioCommand) => Promise<boolean> } | null>(null);
export function AudioProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AudioState>(emptyState);
  const revision = useRef(0);
  const commandError = useRef<string | null>(null);
  const anchor = useRef({ time: performance.now(), state: emptyState });
  const accept = useCallback((next: AudioState) => {
    anchor.current = { time: performance.now(), state: next };
    setState(next);
  }, []);
  useEffect(() => {
    const timer = setInterval(() => {
      const snapshot = anchor.current;
      if (document.visibilityState !== "visible" || !snapshot.state.playing || snapshot.state.buffering) return;
      const position = projectedPosition(snapshot.state, performance.now() - snapshot.time);
      setState(previous => previous.trackId === snapshot.state.trackId ? { ...previous, position } : previous);
    }, 200);
    return () => clearInterval(timer);
  }, []);
  const send = useCallback(async (command: AudioCommand) => {
    const own = ++revision.current;
    commandError.current = null;
    try {
      const next = await audioBackend().execute(command);
      if (own === revision.current) accept(next);
      return true;
    } catch (error) {
      commandError.current = error instanceof Error ? error.message : String(error);
      if (own === revision.current) setState(previous => ({ ...previous, error: commandError.current }));
      return false;
    }
  }, [accept]);
  useEffect(() => {
    let disposed = false, fetching = false;
    async function update() {
      if (fetching || document.visibilityState === "hidden") return;
      fetching = true;
      const own = revision.current;
      try {
        const next = await audioBackend().snapshot();
        if (!disposed && own === revision.current) accept({ ...next, error: next.error ?? commandError.current });
      } catch (error) {
        if (!disposed) setState(previous => ({ ...previous, error: String(error) }));
      } finally { fetching = false; }
    }
    void update();
    const timer = setInterval(() => { void update(); }, 1000);
    document.addEventListener("visibilitychange", update);
    return () => { disposed = true; clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, [accept]);
  return <Context value={{ state, send }}>{children}</Context>;
}
export function useAudio() {
  const context = useContext(Context);
  if (!context) throw new Error("AudioProvider required");
  return context;
}
