import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { useNativeNavigation } from './use-native-navigation';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  Channel: class { onmessage = (_message: unknown) => {}; },
}));

const command = vi.mocked(invoke);
let select: (message: { page: string }) => void;
let compact = true;
let resize: () => void;

beforeEach(() => {
  command.mockReset();
  compact = true;
  vi.stubGlobal('__DDS_NATIVE_NAVIGATION__', true);
  vi.stubGlobal('matchMedia', () => ({
    get matches() { return compact; },
    addEventListener: (_event: string, listener: () => void) => { resize = listener; },
    removeEventListener: vi.fn(),
  }));
  command.mockImplementation(async (name, args) => {
    if (name.endsWith('|attach')) {
      select = (args as { onSelect: { onmessage: typeof select } }).onSelect.onmessage;
      return { supported: true };
    }
    return undefined;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('native journal navigation', () => {
  it('keeps browser navigation without invoking native commands', () => {
    vi.stubGlobal('__DDS_NATIVE_NAVIGATION__', undefined);
    const { result } = renderHook(() => useNativeNavigation('today', vi.fn(), false));
    expect(result.current).toBe(false);
    expect(command).not.toHaveBeenCalled();
  });

  it('keeps the existing navigation when iOS does not support Liquid Glass', async () => {
    command.mockResolvedValue({ supported: false });
    const { result } = renderHook(() => useNativeNavigation('today', vi.fn(), false));
    await waitFor(() => expect(command).toHaveBeenCalledOnce());
    expect(result.current).toBe(false);
  });

  it('synchronizes selection, ignores invalid events and hides for modals or wide layouts', async () => {
    const navigate = vi.fn();
    const { result, rerender } = renderHook(
      ({ page, blocked }: { page: 'today' | 'library'; blocked: boolean }) =>
        useNativeNavigation(page, navigate, blocked),
      { initialProps: { page: 'today', blocked: false } },
    );
    await waitFor(() => expect(result.current).toBe(true));
    act(() => select({ page: 'library' }));
    expect(navigate).toHaveBeenCalledWith('library');
    act(() => select({ page: 'invalid' }));
    expect(navigate).toHaveBeenCalledOnce();
    rerender({ page: 'library', blocked: true });
    await waitFor(() => expect(command).toHaveBeenLastCalledWith(
      'plugin:native-navigation|update',
      expect.objectContaining({ page: 'library', visible: false }),
    ));
    act(() => select({ page: 'today' }));
    expect(navigate).toHaveBeenCalledOnce();
    rerender({ page: 'library', blocked: false });
    await waitFor(() => expect(command).toHaveBeenLastCalledWith(
      'plugin:native-navigation|update', expect.objectContaining({ visible: true }),
    ));
    act(() => { compact = false; resize(); });
    await waitFor(() => expect(command).toHaveBeenLastCalledWith(
      'plugin:native-navigation|update', expect.objectContaining({ visible: false }),
    ));
  });

  it('detaches a late attachment after unmount instead of leaving an orphan overlay', async () => {
    let resolveAttach!: (value: { supported: boolean }) => void;
    command.mockImplementation((name) => name.endsWith('|attach')
      ? new Promise((resolve) => { resolveAttach = resolve; })
      : Promise.resolve(undefined));
    const { unmount } = renderHook(() => useNativeNavigation('today', vi.fn(), false));
    unmount();
    await act(async () => resolveAttach({ supported: true }));
    await waitFor(() => expect(command).toHaveBeenLastCalledWith(
      'plugin:native-navigation|detach', expect.objectContaining({ session: expect.any(String) }),
    ));
    expect(command.mock.calls.some(([name]) => name.endsWith('|update'))).toBe(false);
  });

  it('restores web navigation and detaches when an update fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    command.mockImplementation(async (name) => {
      if (name.endsWith('|attach')) return { supported: true };
      if (name.endsWith('|update')) throw new Error('bridge disconnected');
    });
    const { result } = renderHook(() => useNativeNavigation('today', vi.fn(), false));
    await waitFor(() => expect(command).toHaveBeenCalledWith(
      'plugin:native-navigation|detach', expect.any(Object),
    ));
    expect(result.current).toBe(false);
  });
});
