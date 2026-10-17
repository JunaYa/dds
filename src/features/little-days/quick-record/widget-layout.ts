import { positionWidgets, type WidgetItem } from '@vita/ui/widget-board';

export const widgetLayoutKey = 'little-days.quick-record.widgets.v1';
export function defaultWidgetLayout(typeIds: string[]): WidgetItem[] {
  return positionWidgets([
    { id: 'clock', size: 'medium' },
    ...typeIds.map((id): WidgetItem => ({ id: `record:${id}`, size: 'small' })),
  ]);
}
export function normalizeWidgetLayout(value: unknown, defaults: WidgetItem[]): WidgetItem[] {
  if (!Array.isArray(value)) return defaults;
  const recordIds = new Set(value.map((item) => item?.id));
  const migrated = value.flatMap((item) => {
    const replacement = item?.id === 'feeding' ? 'record:feed' : item?.id === 'sleep' ? 'record:sleep' : null;
    if (!replacement) return [item];
    return recordIds.has(replacement) ? [] : [{ ...item, id: replacement }];
  });
  const seen = new Set<string>();
  return positionWidgets(migrated.flatMap((item) => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || seen.has(item.id)) return [];
    const fallback = defaults.find((entry) => entry.id === item.id);
    if (!fallback) return [];
    seen.add(item.id);
    return [{ id: item.id, col: item.col, row: item.row, size: ['small', 'medium', 'large'].includes(item.size) ? item.size : fallback.size }];
  }));
}
