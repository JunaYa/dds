import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TypeAppearanceEditor } from './type-appearance-editor';
import { prepareTypeBackground } from './type-appearance';

vi.mock('./type-appearance', async (original) => ({
  ...(await original<typeof import('./type-appearance')>()),
  prepareTypeBackground: vi.fn(),
}));

beforeEach(() => vi.mocked(prepareTypeBackground).mockReset());

describe('background image editing', () => {
  it('keeps the previous appearance on decode failure and allows retrying the same file', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    const processing = vi.fn();
    vi.mocked(prepareTypeBackground).mockRejectedValueOnce(new Error('图片无法读取'));
    render(
      <TypeAppearanceEditor
        typeId="note"
        value={{ icon: 'heart' }}
        onChange={change}
        onProcessingChange={processing}
      />,
    );
    const file = new File(['image'], 'background.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('上传背景图片'), file);
    expect(await screen.findByText('图片无法读取')).toBeInTheDocument();
    expect(change).not.toHaveBeenCalled();
    expect(screen.getByLabelText('上传背景图片')).toBeEnabled();
    vi.mocked(prepareTypeBackground).mockResolvedValueOnce('data:image/jpeg;base64,AQID');
    await user.upload(screen.getByLabelText('上传背景图片'), file);
    await waitFor(() =>
      expect(change).toHaveBeenCalledWith({
        icon: 'heart',
        background: { kind: 'image', value: 'data:image/jpeg;base64,AQID' },
      }),
    );
    expect(processing).toHaveBeenLastCalledWith(false);
    expect(screen.queryByText('图片无法读取')).not.toBeInTheDocument();
  });

  it('locks controls while processing and ignores a decoded image after the editor closes', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    const processing = vi.fn();
    let finish!: (value: string) => void;
    vi.mocked(prepareTypeBackground).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { unmount } = render(
      <TypeAppearanceEditor
        typeId="note"
        onChange={change}
        onProcessingChange={processing}
      />,
    );
    await user.upload(
      screen.getByLabelText('上传背景图片'),
      new File(['image'], 'background.png', { type: 'image/png' }),
    );
    expect(screen.getByRole('button', { name: '爱心图标' })).toBeDisabled();
    expect(processing).toHaveBeenLastCalledWith(true);
    unmount();
    await act(async () => finish('data:image/jpeg;base64,AQID'));
    expect(change).not.toHaveBeenCalled();
  });
});
