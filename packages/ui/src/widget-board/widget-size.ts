import type { CSSProperties } from "react";
import type { WidgetSize } from "./widget-board";

// Square-cell grid geometry. The board renders CELL × CELL tracks with GAP
// between them (see widget-grid.tsx); the drag overlay reuses these to size the
// floating clone to the tile.
export const HOME_CELL_REM = 10;
export const HOME_GAP_REM = 0.75;
export const HOME_GRID_MAX_COLUMNS = 4;
export const HOME_CELL = `${HOME_CELL_REM}rem`;
export const HOME_GAP = `${HOME_GAP_REM}rem`; // matches gap-3

// Spans over the square-cell grid (uniform CELL × CELL tracks). small = 1×1,
// medium = 2×1, large = 2×2. On a one-column panel the grid column stretches
// full-width, but widget height stays tied to the preset (medium = 1 row,
// large = 2 rows) so mobile does not invent a different footprint.
const MULTI_COLUMN_SIZE_SPAN: Record<WidgetSize, string> = {
  small: "col-span-1 row-span-1",
  medium: "col-span-2 row-span-1",
  large: "col-span-2 row-span-2",
};

const SINGLE_COLUMN_SIZE_SPAN: Record<WidgetSize, string> = {
  small: "col-span-1 row-span-1",
  medium: "col-span-1 row-span-1",
  large: "col-span-1 row-span-2",
};

function spanCells(count: number): string {
  if (count === 1) return HOME_CELL;
  const gaps = count - 1;
  const gapTerm = gaps === 1 ? HOME_GAP : `${gaps} * ${HOME_GAP}`;
  return `calc(${count} * ${HOME_CELL} + ${gapTerm})`;
}

const SPAN_2 = spanCells(2);

function spanCellVar(count: number): string {
  const cell = "var(--home-cell)";
  if (count === 1) return cell;
  const gaps = count - 1;
  const gapTerm = gaps === 1 ? HOME_GAP : `${gaps} * ${HOME_GAP}`;
  return `calc(${count} * ${cell} + ${gapTerm})`;
}

const SPAN_VAR_2 = spanCellVar(2);

/**
 * Explicit footprint for a tile — used by the drag overlay, which lives
 * outside the grid and so can't rely on the col/row spans. `singleColumn`
 * mirrors the responsive stack in `sizeSpanClass`: one-column overlays take the
 * measured grid width while keeping the preset height.
 */
export function tileSizeStyle(
  size: WidgetSize,
  singleColumn = false,
  singleColumnWidthPx?: number,
  fluidCell = false,
): CSSProperties {
  const cell = fluidCell ? "var(--home-cell)" : HOME_CELL;
  const span2 = fluidCell ? SPAN_VAR_2 : SPAN_2;
  const singleColumnWidth =
    singleColumn && singleColumnWidthPx && singleColumnWidthPx > 0
      ? `${singleColumnWidthPx}px`
      : cell;
  const wide = singleColumn ? singleColumnWidth : span2;
  switch (size) {
    case "small":
      return { width: singleColumn ? singleColumnWidth : cell, height: cell };
    case "medium":
      return { width: wide, height: cell };
    default:
      return { width: wide, height: span2 };
  }
}

export function sizeSpanClass(size: WidgetSize, singleColumn = false): string {
  // Fallback guards against a stale/unknown token slipping through persistence
  // and yielding an undefined class (which collapses the tile to 1×1).
  const spans = singleColumn ? SINGLE_COLUMN_SIZE_SPAN : MULTI_COLUMN_SIZE_SPAN;
  return spans[size] ?? spans.medium;
}

export function nextSize(sizes: WidgetSize[], current: WidgetSize): WidgetSize {
  const index = sizes.indexOf(current);
  if (index === -1) return sizes[0] ?? current;
  const next = sizes[(index + 1) % sizes.length];
  return next ?? current;
}
