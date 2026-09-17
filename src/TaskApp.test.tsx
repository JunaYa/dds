import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { invoke } from '@tauri-apps/api/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './TaskApp';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: () => true }));
const command = vi.mocked(invoke);
const task = {
  id: 'task-1', name: '迁移设计系统', completed: false,
  created_at: '2026-09-16T08:00:00Z', updated_at: '', completed_at: null,
  duration: 0, tags: [], children: [],
};

beforeEach(() => command.mockReset());

describe('DDS task workflow', () => {
  it('loads tasks and refreshes the completed state after completion', async () => {
    command.mockResolvedValueOnce([task]).mockResolvedValueOnce(true)
      .mockResolvedValueOnce([{ ...task, completed: true, completed_at: '2026-09-16T09:00:00Z' }]);
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: '完成：迁移设计系统' }));
    await waitFor(() => expect(command).toHaveBeenCalledWith('complete_task', { id: 'task-1' }));
    expect(await screen.findByText('已完成')).toBeInTheDocument();
  });

  it('rejects blank names and submits a trimmed name exactly once', async () => {
    command.mockResolvedValueOnce([]).mockResolvedValueOnce(true).mockResolvedValueOnce([task]);
    render(<App />);
    await screen.findByText('还没有任务');
    const input = screen.getByRole('textbox', { name: '任务名称' });
    await userEvent.type(input, '   ');
    expect(screen.getByRole('button', { name: '添加任务' })).toBeDisabled();
    await userEvent.type(input, '迁移设计系统  ');
    await userEvent.click(screen.getByRole('button', { name: '添加任务' }));
    await screen.findByText('迁移设计系统');
    expect(command.mock.calls.filter(([name]) => name === 'add_task')).toEqual([
      ['add_task', { name: '迁移设计系统' }],
    ]);
    expect(input).toHaveValue('');
  });

  it('keeps the draft and allows retry when adding fails', async () => {
    command.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('写入失败'));
    render(<App />);
    await screen.findByText('还没有任务');
    const input = screen.getByRole('textbox', { name: '任务名称' });
    await userEvent.type(input, '保留草稿');
    await userEvent.click(screen.getByRole('button', { name: '添加任务' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('写入失败');
    expect(input).toHaveValue('保留草稿');
    expect(screen.getByRole('button', { name: '添加任务' })).toBeEnabled();
  });

  it('shows load errors with a working retry action', async () => {
    command.mockRejectedValueOnce(new Error('读取失败')).mockResolvedValueOnce([task]);
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('读取失败');
    await userEvent.click(screen.getByRole('button', { name: '重新加载' }));
    expect(await screen.findByText('迁移设计系统')).toBeInTheDocument();
  });

  it('does not restore a saved draft when only the subsequent refresh fails', async () => {
    command.mockResolvedValueOnce([]).mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error('刷新失败')).mockResolvedValueOnce([task]);
    render(<App />);
    await screen.findByText('还没有任务');
    const input = screen.getByRole('textbox', { name: '任务名称' });
    await userEvent.type(input, task.name);
    await userEvent.click(screen.getByRole('button', { name: '添加任务' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('刷新失败');
    expect(input).toHaveValue('');
    await userEvent.click(screen.getByRole('button', { name: '重新加载' }));
    expect(await screen.findByText(task.name)).toBeInTheDocument();
    expect(command.mock.calls.filter(([name]) => name === 'add_task')).toHaveLength(1);
  });

  it('keeps an unfinished task actionable after completion fails', async () => {
    command.mockResolvedValueOnce([task]).mockRejectedValueOnce(new Error('完成失败'));
    render(<App />);
    const complete = await screen.findByRole('button', { name: `完成：${task.name}` });
    await userEvent.click(complete);
    expect(await screen.findByRole('alert')).toHaveTextContent('完成失败');
    expect(complete).toBeEnabled();
    expect(screen.queryByText('已完成')).not.toBeInTheDocument();
  });
});
