import type { WidgetItem } from './widget-board';
import { widgetSpan } from './widget-grid-geometry';
export type PositionedWidget = WidgetItem & { col: number; row: number };
export function overlaps(a: PositionedWidget, b: PositionedWidget, columns: number) {
  const x = widgetSpan(a.size), y = widgetSpan(b.size);
  return a.col < b.col + Math.min(y.cols, columns) && b.col < a.col + Math.min(x.cols, columns) && a.row < b.row + y.rows && b.row < a.row + x.rows;
}
export function positionWidgets(items: WidgetItem[], columns = 4): PositionedWidget[] {
  const result: PositionedWidget[] = [];
  const missing: WidgetItem[] = [];
  for (const item of items) {
    if (!Number.isInteger(item.row) || !Number.isInteger(item.col) || item.row! < 0 || item.col! < 0) { missing.push(item); continue; }
    const next = { ...item, col: Math.min(item.col!, columns - Math.min(widgetSpan(item.size).cols, columns)), row: item.row! };
    while (result.some((other) => overlaps(next, other, columns))) next.row++;
    result.push(next);
  }
  for (const item of missing) {
    const next = { ...item, col: 0, row: 0 };
    while (result.some((other) => overlaps(next, other, columns))) {
      next.col++;
      if (next.col + Math.min(widgetSpan(item.size).cols, columns) > columns) { next.col = 0; next.row++; }
    }
    result.push(next);
  }
  return items.map((item) => result.find((entry) => entry.id === item.id)!);
}
export function moveWidgetTo(items: PositionedWidget[], id: string, col: number, row: number, columns: number) {
  const item = items.find((entry) => entry.id === id);
  if (!item) return items;
  const next = { ...item, col, row };
  if (col < 0 || row < 0 || col + Math.min(widgetSpan(item.size).cols, columns) > columns || items.some((other) => other.id !== id && overlaps(next, other, columns))) return items;
  return items.map((entry) => entry.id === id ? next : entry);
}
