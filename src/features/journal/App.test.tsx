import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import * as storage from './storage';
import { newRecord } from './model';

afterEach(() => vi.unstubAllGlobals());

beforeEach(async () => {
  vi.restoreAllMocks();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('dds-journal');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  window.history.replaceState(null, '', '/');
});
const app = () => render(<App />);
describe('journal application integration', () => {
  it('starts with useful types and no demonstration records or reminders', async () => {
    app();
    await screen.findByRole('button', { name: '记一笔', exact: true });
    const state = await storage.readState();
    expect(state.records).toEqual([]);
    expect(state.tasks).toEqual([]);
    expect(state.plan.paused).toBe(true);
    expect(state.types.map((type) => type.id)).toContain('photo');
    expect(screen.queryByText(/含示例数据/)).not.toBeInTheDocument();
  });
  it('saves a record through shared UI controls and reads it after remount', async () => {
    const user = userEvent.setup();
    const first = app();
    await user.click(await screen.findByRole('button', { name: '记一笔', exact: true }));
    await user.type(screen.getByRole('textbox', { name: '标题（可选）' }), '第一条日记');
    await user.type(screen.getByRole('textbox', { name: '内容 *' }), '今天散步遇到一只猫。');
    await user.click(screen.getByRole('button', { name: '保存记录', exact: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    first.unmount();
    app();
    const savedRecord = await screen.findByRole('button', {
      name: /第一条日记.*今天散步遇到一只猫/,
    });
    expect(savedRecord).toHaveTextContent('第一条日记');
    expect(savedRecord).toHaveTextContent('今天散步遇到一只猫。');
  });
  it('keeps a failed draft and retries without duplicate records', async () => {
    const user = userEvent.setup();
    app();
    await user.click(await screen.findByRole('button', { name: '记一笔', exact: true }));
    await user.type(screen.getByRole('textbox', { name: '标题（可选）' }), '保留草稿');
    await user.type(screen.getByRole('textbox', { name: '内容 *' }), '存储失败也不要丢失。');
    vi.spyOn(storage, 'persistAction').mockRejectedValueOnce(new Error('存储已满'));
    await user.click(screen.getByRole('button', { name: '保存记录', exact: true }));
    expect(await screen.findByText('存储已满')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '内容 *' })).toHaveValue('存储失败也不要丢失。');
    await user.click(screen.getByRole('button', { name: '保存记录', exact: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(
      (await storage.readState()).records.filter((record) => record.title === '保留草稿'),
    ).toHaveLength(1);
  });
  it('previews SVG as an image and only offers a download for the original file', async () => {
    await storage.readState();
    await storage.persistAction({
      kind: 'record',
      record: {
        ...newRecord('photo', {}, 'SVG 安全预览'),
        attachments: [
          {
            id: 'svg',
            name: 'receipt.svg',
            mime: 'image/svg+xml',
            size: 11,
            fieldId: 'attachment',
          },
        ],
      },
    });
    vi.spyOn(storage, 'readFile').mockResolvedValue(
      new Blob(['<svg></svg>'], { type: 'image/svg+xml' }),
    );
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL() {
          return 'blob:test-svg';
        }
        static revokeObjectURL() {}
      },
    );
    const user = userEvent.setup();
    app();
    await user.click(await screen.findByRole('button', { name: /SVG 安全预览/ }));
    const preview = await screen.findByRole('img', { name: 'receipt.svg' });
    expect(preview.closest('a')).toBeNull();
    expect(screen.getByRole('link', { name: 'receipt.svg' })).toHaveAttribute(
      'download',
      'receipt.svg',
    );
  });
});
