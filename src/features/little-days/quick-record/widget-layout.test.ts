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
  const saved = [{ id: 'clock', size: 'medium', col: 1, row: 4 }, { id: 'record:sleep', size: 'small', col: 0, row: 0 }];
  expect(normalizeWidgetLayout(saved, defaults)).toEqual(saved);
});

it('merges legacy feeding widgets while preserving the recording tile position', () => {
  const feed = { id: 'record:feed', size: 'small', col: 1, row: 3 };
  const legacy = { id: 'feeding', size: 'medium', col: 0, row: 0 };
  expect(normalizeWidgetLayout([legacy, feed], defaults)).toEqual([feed]);
  expect(normalizeWidgetLayout([legacy], defaults)).toEqual([{ ...legacy, id: 'record:feed' }]);
  expect(defaults.some((item) => item.id === 'feeding')).toBe(false);
});

it('merges the sleep timer into the sleep record widget', () => {
  const sleep = { id: 'record:sleep', size: 'large', col: 2, row: 4 };
  const legacy = { id: 'sleep', size: 'small', col: 0, row: 1 };
  expect(normalizeWidgetLayout([legacy, sleep], defaults)).toEqual([sleep]);
  expect(normalizeWidgetLayout([legacy], defaults)).toEqual([{ ...legacy, id: 'record:sleep' }]);
  expect(defaults.some((item) => item.id === 'sleep')).toBe(false);
});
