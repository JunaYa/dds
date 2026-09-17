import 'fake-indexeddb/auto';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  it('saves feeding times and quantity, keeps invalid drafts, and displays the record after reload', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/?view=library');
    const first = app();
    await user.click(await screen.findByRole('button', { name: '记一笔', exact: true }));
    fireEvent.change(screen.getByLabelText('发生时间'), { target: { value: '' } });
    await user.click(screen.getByRole('combobox', { name: '记录类型' }));
    await user.click(await screen.findByRole('option', { name: '婴儿哺乳', exact: true }));
    expect(screen.queryByLabelText('发生时间')).not.toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: '喂养方式 *' }));
    await screen.findByRole('option', { name: '混合喂养', exact: true });
    for (const name of ['全母乳', '全奶粉', '混合喂养'])
      expect(screen.getByRole('option', { name, exact: true })).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: '混合喂养', exact: true }));
    await user.type(screen.getByRole('textbox', { name: '标题（可选）' }), '夜间哺乳');
    fireEvent.change(screen.getByLabelText('开始时间 *'), {
      target: { value: '2026-09-16T23:50' },
    });
    fireEvent.change(screen.getByLabelText('结束时间 *'), {
      target: { value: '2026-09-16T23:40' },
    });
    await user.type(screen.getByRole('spinbutton', { name: '喂养量（ml） *' }), '120');
    await user.click(screen.getByRole('button', { name: '保存记录', exact: true }));
    expect(await screen.findByText('结束时间不能早于开始时间')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: '喂养量（ml） *' })).toHaveValue(120);
    fireEvent.change(screen.getByLabelText('结束时间 *'), {
      target: { value: '2026-09-17T00:15' },
    });
    await user.click(screen.getByRole('button', { name: '保存记录', exact: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    first.unmount();
    app();
    await user.click(
      await screen.findByRole('button', { name: /夜间哺乳.*混合喂养.*120 ml/ }),
    );
    const detail = within(screen.getByRole('dialog'));
    expect(detail.getByText('混合喂养')).toBeInTheDocument();
    expect(detail.getByText(/2026.*23:50/)).toBeInTheDocument();
    expect(detail.getByText(/2026.*00:15/)).toBeInTheDocument();
    expect(detail.getByText('120 ml')).toBeInTheDocument();
    const state = await storage.readState();
    expect(state.records).toHaveLength(1);
    expect(state.records[0].occurredAt).toBe(new Date('2026-09-16T23:50').toISOString());
  });
  it('edits type appearance, keeps a failed draft, reloads and restores defaults', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/?view=types');
    const first = app();
    await user.click(await screen.findByRole('button', { name: '编辑随手记外观' }));
    await user.click(screen.getByRole('button', { name: '爱心图标' }));
    await user.click(screen.getByRole('button', { name: '深林背景' }));
    vi.spyOn(storage, 'persistAction').mockRejectedValueOnce(new Error('存储已满'));
    await user.click(screen.getByRole('button', { name: '保存外观' }));
    expect(await screen.findByText('存储已满')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '爱心图标' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: '保存外观' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    first.unmount();
    app();
    await user.click(await screen.findByRole('button', { name: '编辑随手记外观' }));
    expect(screen.getByRole('button', { name: '爱心图标' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: '深林背景' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: '恢复默认外观' }));
    await user.click(screen.getByRole('button', { name: '保存外观' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect((await storage.readState()).types[0].appearance).toBeUndefined();
  });
  it('saves a new type with appearance and discards cancelled appearance edits', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/?view=types');
    app();
    await user.click(await screen.findByRole('button', { name: '新建记录类型' }));
    await user.type(screen.getByRole('textbox', { name: '类型名称' }), '阅读');
    await user.click(screen.getByRole('button', { name: '月亮图标' }));
    await user.click(screen.getByRole('button', { name: '晴空背景' }));
    await user.click(screen.getByRole('button', { name: '创建记录类型' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const saved = (await storage.readState()).types.find((type) => type.name === '阅读')!;
    expect(saved.appearance).toEqual({
      icon: 'moon',
      background: { kind: 'color', value: '#DBE8F4' },
    });
    await user.click(screen.getByRole('button', { name: '编辑阅读外观' }));
    await user.click(screen.getByRole('button', { name: '爱心图标' }));
    await user.click(screen.getByRole('button', { name: '关闭弹窗' }));
    expect((await storage.readState()).types.find((type) => type.id === saved.id)).toEqual(
      saved,
    );
  });
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
    expect(screen.getByRole('textbox', { name: '内容 *' })).toHaveValue(
      '存储失败也不要丢失。',
    );
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
