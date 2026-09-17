import { useEffect, useRef, useState } from 'react';
import { Channel, invoke } from '@tauri-apps/api/core';

export type JournalPage = 'today' | 'board' | 'library' | 'types';

declare global {
  interface Window { __DDS_NATIVE_NAVIGATION__?: boolean }
}

const pages: readonly string[] = ['today', 'board', 'library', 'types'];
const command = 'plugin:native-navigation|';

export function useNativeNavigation(
  page: JournalPage,
  onNavigate: (page: JournalPage) => void,
  blocked: boolean,
) {
  const [active, setActive] = useState(false);
  const latest = useRef({ page, onNavigate, blocked });
  latest.current = { page, onNavigate, blocked };
  const sync = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!window.__DDS_NATIVE_NAVIGATION__) return;
    const session = crypto.randomUUID();
    const compact = matchMedia('(max-width: 720px)');
    let disposed = false;
    let attached = false;
    let queue = Promise.resolve();
    const detach = () => invoke(`${command}detach`, { session }).catch((error: unknown) => {
      console.warn('Unable to detach native navigation', error);
    });
    const update = () => {
      if (!attached || disposed) return;
      queue = queue.then(async () => {
        if (disposed) return;
        await invoke(`${command}update`, {
          session,
          page: latest.current.page,
          visible: compact.matches && !latest.current.blocked,
        });
      }).catch(async (error: unknown) => {
        console.warn('Native navigation unavailable; restoring web navigation', error);
        disposed = true;
        setActive(false);
        await detach();
      });
    };
    sync.current = update;
    compact.addEventListener('change', update);
    const onSelect = new Channel<{ page: string }>();
    onSelect.onmessage = (message) => {
      if (!disposed && compact.matches && !latest.current.blocked && pages.includes(message.page)) {
        latest.current.onNavigate(message.page as JournalPage);
      }
    };
    queue = invoke<{ supported: boolean }>(`${command}attach`, {
      session, page: latest.current.page, onSelect,
    }).then(({ supported }) => {
      if (disposed || !supported) return;
      attached = true;
      setActive(true);
      update();
    }).catch((error: unknown) => {
      console.warn('Native navigation unavailable; keeping web navigation', error);
    });
    return () => {
      disposed = true;
      onSelect.onmessage = () => {};
      sync.current = null;
      compact.removeEventListener('change', update);
      void queue.then(detach);
    };
  }, []);

  useEffect(() => { sync.current?.(); }, [page, blocked]);
  return active;
}
