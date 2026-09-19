import 'fake-indexeddb/auto';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import App from './test-app';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  Channel: class { onmessage = (_message: unknown) => {}; },
}));

let action: (message: { action: string }) => void;
let navigate: (message: { page: string }) => void;
beforeEach(async () => {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('dds-journal');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  window.history.replaceState(null, '', '/?view=board&boardView=calendar');
  vi.stubGlobal('__DDS_NATIVE_NAVIGATION__', true);
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('max-width: 720px'),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.mocked(invoke).mockImplementation(async (name, args) => {
    if (name.endsWith('|attach')) {
      action = (args as { onAction: { onmessage: typeof action } }).onAction.onmessage;
      navigate = (args as { onSelect: { onmessage: typeof navigate } }).onSelect.onmessage;
      return { supported: true, headerSupported: true };
    }
  });
});
afterEach(async () => {
  await act(async () => cleanup());
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

describe('native header actions', () => {
  it('opens search with focus, clears it on navigation, and creates the current page item', async () => {
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(document.querySelector('.journal-shell')).toHaveAttribute('data-native-header', 'true'));
    act(() => action({ action: 'search' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('记录库');
    expect(screen.getByRole('searchbox', { name: '搜索记录' })).toHaveFocus();
    await user.type(screen.getByRole('searchbox', { name: '搜索记录' }), '散步');
    act(() => navigate({ page: 'types' }));
    expect(screen.getByRole('searchbox', { name: '搜索记录' })).toHaveValue('');
    expect(screen.queryByRole('button', { name: '取消搜索' })).not.toBeInTheDocument();
    act(() => action({ action: 'create' }));
    expect(screen.getByRole('textbox', { name: '类型名称' })).toBeInTheDocument();
    await waitFor(() => expect(invoke).toHaveBeenLastCalledWith('plugin:native-navigation|update', expect.objectContaining({ visible: false })));
    await user.click(screen.getByRole('button', { name: '关闭弹窗' }));
    act(() => navigate({ page: 'board' }));
    act(() => action({ action: 'create' }));
    expect(screen.getByRole('button', { name: '保存记录', exact: true })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '关闭弹窗' }));
    await waitFor(() => expect(invoke).toHaveBeenLastCalledWith('plugin:native-navigation|update', expect.objectContaining({ visible: true })));
  });

  it('routes menu actions and keeps the record draft while native actions are blocked', async () => {
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(document.querySelector('.journal-shell')).toHaveAttribute('data-native-header', 'true'));
    for (const [menu, heading] of [['capture', '图片速记'], ['reminders', '提醒与安排'], ['plan', '循环计划']]) {
      act(() => action({ action: menu }));
      expect(screen.getByRole('dialog')).toHaveAccessibleName(heading);
      await user.click(screen.getByRole('button', { name: '关闭弹窗' }));
    }
    act(() => action({ action: 'create' }));
    await user.type(screen.getByRole('textbox', { name: '标题（可选）' }), '保留草稿');
    act(() => action({ action: 'search' }));
    expect(screen.getByRole('textbox', { name: '标题（可选）' })).toHaveValue('保留草稿');
  });
});
