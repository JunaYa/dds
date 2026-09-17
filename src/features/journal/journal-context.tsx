import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Action, JournalState } from './model';
import { databaseName, persistAction, readFile, readState, type PendingFile } from './storage';
import { Button } from '@vita/ui/button';
import { Alert, AlertDescription } from '@vita/ui/alert';

type JournalContextValue = {
  demo: boolean;
  readAttachment: (id: string) => Promise<Blob>;
  state: JournalState;
  busy: boolean;
  save: (action: Action, files?: PendingFile[]) => Promise<void>;
  message: string;
  notify: (message: string) => void;
};
const Context = createContext<JournalContextValue | null>(null);
export function JournalProvider({
  children,
  demo = false,
}: {
  children: ReactNode;
  demo?: boolean;
}) {
  const mode = demo ? 'example' : 'app';
  const readAttachment = useCallback((id: string) => readFile(id, mode), [mode]);
  const [state, setState] = useState<JournalState | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const channel = useRef<BroadcastChannel | null>(null);
  const saving = useRef(false);
  const load = useCallback(async () => {
    try {
      setState(await readState(mode));
      setError('');
    } catch {
      setError('无法读取本机记录。请检查设备存储后重试，已有数据未被覆盖。');
    }
  }, [mode]);
  useEffect(() => {
    void load();
    channel.current =
      typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(databaseName(mode));
    if (channel.current) channel.current.onmessage = () => void load();
    return () => channel.current?.close();
  }, [load, mode]);
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);
  async function save(action: Action, files?: PendingFile[]) {
    if (saving.current) throw new Error('上一笔记录正在保存，请稍后再试');
    saving.current = true;
    setBusy(true);
    try {
      setState(await persistAction(action, files, mode));
      channel.current?.postMessage('changed');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  if (!state)
    return (
      <main className="grid min-h-screen place-content-center gap-4 p-6">
        <h1 className="text-xl font-semibold">日日记</h1>
        {error ? (
          <>
            <Alert variant="error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={() => void load()}>重试</Button>
          </>
        ) : (
          <p role="status">正在读取本机记录…</p>
        )}
      </main>
    );
  return (
    <Context.Provider
      value={{
        state,
        busy,
        save,
        message,
        notify: setMessage,
        demo,
        readAttachment,
      }}
    >
      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {children}
      <div className="journal-toast" role="status" aria-live="polite">
        {message && (
          <Alert className="bg-popover shadow-lg">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
      </div>
    </Context.Provider>
  );
}
export function useJournal() {
  const value = useContext(Context);
  if (!value) throw new Error('JournalProvider is required');
  return value;
}
export const errorText = (cause: unknown) =>
  cause instanceof Error ? cause.message : '操作失败，请重试';
