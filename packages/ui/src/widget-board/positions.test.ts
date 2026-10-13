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
