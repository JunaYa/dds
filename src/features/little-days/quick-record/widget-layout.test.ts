import { expect, it } from 'vitest';
import { defaultWidgetLayout, normalizeWidgetLayout } from './widget-layout';
const defaults = defaultWidgetLayout(['feed', 'sleep']);
it('rejects malformed storage and filters unknown and duplicate widgets', () => {
  expect(normalizeWidgetLayout({}, defaults)).toEqual(defaults);
  expect(normalizeWidgetLayout([null, { id: 'clock', size: 'invalid' }, { id: 'clock', size: 'small' }, { id: 'gone', size: 'large' }], defaults)).toEqual([{ id: 'clock', size: 'medium', col: 0, row: 0 }]);
});
it('preserves an intentionally empty layout and valid saved order', () => {
  expect(normalizeWidgetLayout([], defaults)).toEqual([]);
  const saved = [{ id: 'record:sleep', size: 'large' }, { id: 'clock', size: 'small' }];
  expect(normalizeWidgetLayout(saved, defaults)).toEqual([{ ...saved[0], col: 0, row: 0 }, { ...saved[1], col: 2, row: 0 }]);
});

it('preserves empty rows and positions across storage normalization', () => {
  const saved = [{ id: 'clock', size: 'medium', col: 1, row: 4 }, { id: 'sleep', size: 'small', col: 0, row: 0 }];
  expect(normalizeWidgetLayout(saved, defaults)).toEqual(saved);
});
