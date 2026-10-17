import { useState } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, vi, afterEach, expect, it } from 'vitest';
import { WidgetBoard, moveWidget, type WidgetItem, type WidgetBoardLabels } from './widget-board';
beforeEach(() => vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const labels: WidgetBoardLabels = { move: (name) => `Drag ${name}`, remove: (name) => `Remove ${name}`, removeText: 'Remove', options: (name) => `Options ${name}`, resize: 'Size', canDrop: 'Release to place here', canSwap: 'Release to swap positions', cannotDrop: 'Cannot place here', sizes: { small: 'Small', medium: 'Medium', large: 'Large' } };
function Demo() {
  const [items, setItems] = useState<WidgetItem[]>([{ id: 'a', size: 'medium' }, { id: 'b', size: 'small' }]);
  return <WidgetBoard items={items} editing onChange={setItems} labels={labels}
    definitions={['a', 'b'].map((id) => ({ id, title: id, sizes: ['small', 'medium', 'large'], render: () => id }))} />;
}
it('exposes sizes and removal in the corner menu', async () => {
  render(<Demo />);
  const user = userEvent.setup();
  expect(screen.getAllByRole('button')).toHaveLength(4);
  expect(screen.queryByRole('combobox')).toBeNull();
  expect(screen.getByRole('region', { name: 'a' })).toHaveAttribute('data-size', 'medium');
  await user.click(screen.getByRole('button', { name: 'Options a' }));
  expect(await screen.findByRole('menuitemradio', { name: 'Medium' })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByRole('menuitemradio', { name: 'Large' })).toHaveAttribute('aria-disabled', 'true');
  await user.click(screen.getByRole('menuitemradio', { name: 'Small' }));
  expect(screen.getByRole('region', { name: 'a' })).toHaveAttribute('data-size', 'small');
  await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  await waitFor(() => expect(screen.getByRole('button', { name: 'Options a' })).toHaveFocus());
  await user.click(screen.getByRole('button', { name: 'Options a' }));
  expect(await screen.findByRole('menuitemradio', { name: 'Small' })).toHaveAttribute('aria-checked', 'true');
  await user.click(await screen.findByRole('menuitem', { name: 'Remove a' }));
  expect(screen.queryByRole('region', { name: 'a' })).toBeNull();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Drag b' })).toHaveFocus());
});
it('moves widgets without changing their sizes and ignores stale IDs', () => {
  const items: WidgetItem[] = [{ id: 'a', size: 'medium' }, { id: 'b', size: 'small' }];
  expect(moveWidget(items, 'a', 'b')).toEqual([items[1], items[0]]);
  expect(moveWidget(items, 'missing', 'a')).toBe(items);
});
it('cancels keyboard dragging without removing the handle or changing order', async () => {
  const { container } = render(<Demo />);
  const user = userEvent.setup();
  const handle = screen.getByRole('button', { name: 'Drag a' });
  handle.focus();
  await user.keyboard('[Space]');
  expect(container.querySelector('[data-dragging]')).not.toBeNull();
  expect(container.querySelector('.vita-widget-drop-target')).toHaveAttribute('data-valid', 'true');
  expect(screen.getAllByText('Release to place here').length).toBeGreaterThan(0);
  await user.keyboard('[Escape]');
  expect(container.querySelector('[data-dragging]')).toBeNull();
  expect(container.querySelector('.vita-widget-drop-target')).toBeNull();
  expect(screen.getAllByRole('region').map((el) => el.getAttribute('aria-label'))).toEqual(['a', 'b']);
  expect(handle).toHaveFocus();
});
