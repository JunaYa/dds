import 'fake-indexeddb/auto';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './test-app';
import { newRecord } from './model';
import { persistAction, readState } from './storage';

beforeEach(async () => {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('dds-journal');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 18, 12));
  window.history.replaceState(null, '', '/?view=board');
});
afterEach(() => vi.useRealTimers());

describe('board calendar', () => {
  it('opens records and handles dated tasks through the calendar, with type filtering and view restoration', async () => {
    await readState();
    await persistAction({ kind: 'record', record: newRecord('water', { amount: 250 }, '早晨喝水', new Date(2026, 8, 18, 8)) });
    await persistAction({ kind: 'record', record: newRecord('note', { content: '昨天的心情' }, '晚间日记', new Date(2026, 8, 17, 23, 50)) });
    await persistAction({
      kind: 'record',
      record: newRecord('event', { location: '社区医院' }, '复诊预约', new Date(2026, 8, 18, 9)),
      event: { due: new Date(2026, 8, 19, 10).toISOString(), reminder: null },
    });
    const user = userEvent.setup();
    const first = render(<App />);
    await user.click(await screen.findByRole('tab', { name: '日历', exact: true }));
    expect(screen.getByRole('tab', { name: '日历', exact: true })).toHaveAttribute('aria-selected', 'true');
    expect(new URLSearchParams(location.search).get('boardView')).toBe('calendar');
    expect(screen.getByRole('button', { name: /2026年9月18日.*2 条记录，0 件待办/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /早晨喝水.*250 ml/ }));
    expect(within(screen.getByRole('dialog')).getByText('250 ml')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '关闭弹窗' }));
    await user.click(screen.getByRole('button', { name: /2026年9月17日.*1 条记录/ }));
    expect(within(screen.getByRole('region', { name: '当天明细' })).getByText('晚间日记')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '回到今天' }));
    await user.click(screen.getByRole('combobox', { name: '日历记录类型' }));
    await user.click(await screen.findByRole('option', { name: '饮水', exact: true }));
    expect(screen.getByRole('button', { name: /2026年9月18日.*1 条记录，0 件待办/ })).toBeInTheDocument();
    expect(screen.queryByText('复诊预约')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /2026年9月17日/ }));
    expect(screen.getByText('这一天没有该类型的记录或待办，可以切换类型或日期。')).toBeInTheDocument();
    first.unmount();
    render(<App />);
    await screen.findByRole('grid', { name: '2026年9月日历' });
    await user.click(screen.getByRole('button', { name: /2026年9月19日.*0 条记录，1 件待办/ }));
    await user.click(within(screen.getByRole('region', { name: '当天待办' })).getByRole('button', { name: /复诊预约/ }));
    expect(screen.getByRole('textbox', { name: '标题（可选）' })).toHaveValue('复诊预约');
    await user.click(screen.getByRole('button', { name: '完成并保存记录' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /2026年9月19日.*0 条记录，0 件待办/ })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: '卡片', exact: true }));
    expect(screen.getByRole('button', { name: '管理卡片' })).toBeInTheDocument();
  });

  it('navigates months, keeps keyboard date navigation and returns to today', async () => {
    vi.setSystemTime(new Date(2024, 0, 31, 12));
    window.history.replaceState(null, '', '/?view=board&boardView=calendar');
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: '下个月', exact: true }));
    expect(screen.getByRole('heading', { name: /2024年2月29日/ })).toBeInTheDocument();
    const leapDay = screen.getByRole('button', { name: /2024年2月29日/ });
    leapDay.focus();
    await user.keyboard('{ArrowLeft}{Enter}');
    expect(screen.getByRole('heading', { name: /2024年2月28日/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '上个月', exact: true }));
    expect(screen.getByRole('heading', { name: /2024年1月28日/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '回到今天' }));
    expect(screen.getByRole('heading', { name: /2024年1月31日/ })).toBeInTheDocument();
    expect(screen.getByText('这一天还没有记录或待办，试试其他日期。')).toBeInTheDocument();
  });
});
