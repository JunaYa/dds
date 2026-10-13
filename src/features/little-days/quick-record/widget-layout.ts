import { positionWidgets, type WidgetItem } from '@vita/ui/widget-board';

export const widgetLayoutKey = 'little-days.quick-record.widgets.v1';
export function defaultWidgetLayout(typeIds: string[]): WidgetItem[] {
  return positionWidgets([
    { id: 'clock', size: 'medium' },
    { id: 'sleep', size: 'small' },
    { id: 'feeding', size: 'small' },
    ...typeIds.map((id): WidgetItem => ({ id: `record:${id}`, size: 'small' })),
  ]);
}
export function normalizeWidgetLayout(value: unknown, defaults: WidgetItem[]): WidgetItem[] {
  if (!Array.isArray(value)) return defaults;
  const seen = new Set<string>();
  return positionWidgets(value.flatMap((item) => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || seen.has(item.id)) return [];
    const fallback = defaults.find((entry) => entry.id === item.id);
    if (!fallback) return [];
    seen.add(item.id);
    return [{ id: item.id, col: item.col, row: item.row, size: ['small', 'medium', 'large'].includes(item.size) ? item.size : fallback.size }];
  }));
}
