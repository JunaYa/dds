import { expect, it } from 'vitest';
import { moveWidgetTo, positionWidgets } from './positions';
it('moves into an empty row without shifting other widgets', () => {
  const items = positionWidgets([{ id: 'a', size: 'medium' }, { id: 'b', size: 'small' }]);
  const moved = moveWidgetTo(items, 'a', 0, 3, 4);
  expect(moved).toEqual([{ id: 'a', size: 'medium', col: 0, row: 3 }, items[1]]);
  expect(positionWidgets(moved)).toEqual(moved);
  expect(positionWidgets(moved.filter((item) => item.id === 'a'))[0].row).toBe(3);
});
it('rejects overlap and out-of-bounds placement', () => {
  const items = positionWidgets([{ id: 'a', size: 'large' }, { id: 'b', size: 'small' }]);
  expect(moveWidgetTo(items, 'a', 1, 0, 4)).toBe(items);
  expect(moveWidgetTo(items, 'a', 3, 3, 4)).toBe(items);
  expect(moveWidgetTo(items, 'a', 0, -1, 4)).toBe(items);
});
it('places new widgets without moving already positioned widgets', () => {
  const items = positionWidgets([{ id: 'a', size: 'large', col: 2, row: 3 }, { id: 'b', size: 'small' }]);
  expect(items[0]).toEqual({ id: 'a', size: 'large', col: 2, row: 3 });
  expect(items[1]).toEqual({ id: 'b', size: 'small', col: 0, row: 0 });
});

it.each(['small', 'medium', 'large'] as const)('swaps %s widgets without changing other positions or gaps', (size) => {
  const items = positionWidgets([
    { id: 'a', size, col: 0, row: 0 },
    { id: 'b', size, col: 2, row: 4 },
    { id: 'c', size: 'small', col: 0, row: 7 },
  ]);
  const swapped = moveWidgetTo(items, 'a', 2, 4, 4);
  expect(swapped).toEqual([{ ...items[0], col: 2, row: 4 }, { ...items[1], col: 0, row: 0 }, items[2]]);
  expect(positionWidgets(swapped)).toEqual(swapped);
  expect(moveWidgetTo(swapped, 'a', 0, 0, 4)).toEqual(items);
});
it('rejects partial overlap and overlap with multiple widgets', () => {
  const items = positionWidgets([
    { id: 'a', size: 'medium', col: 0, row: 0 },
    { id: 'b', size: 'medium', col: 0, row: 2 },
    { id: 'c', size: 'small', col: 2, row: 2 },
  ]);
  expect(moveWidgetTo(items, 'a', 1, 2, 4)).toBe(items);
  expect(moveWidgetTo(items.slice(0, 2), 'a', 1, 2, 4)).toEqual(items.slice(0, 2));
});
