import type { CSSProperties } from "react";
import type { WidgetSize } from "./widget-board";
import {
  HOME_CELL,
  HOME_CELL_REM,
  HOME_GAP,
  HOME_GAP_REM,
  HOME_GRID_MAX_COLUMNS,
} from "./widget-size.ts";

export interface GridSpan {
  cols: number;
  rows: number;
}

export interface GridCell {
  col: number;
  row: number;
}

export function rootRemPx(): number {
  if (typeof document === "undefined") return 16;
  return Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
}

export function widgetGridStepPx(rem = rootRemPx()): number {
  return (HOME_CELL_REM + HOME_GAP_REM) * rem;
}

export function widgetGridGapPx(rem = rootRemPx()): number {
  return HOME_GAP_REM * rem;
}

const WIDGET_GRID_FOUR_COLUMN_MIN_REM = 40;
const WIDGET_GRID_MIN_CELL_REM =
  (40 - (HOME_GRID_MAX_COLUMNS - 1) * HOME_GAP_REM) / HOME_GRID_MAX_COLUMNS;
const WIDGET_GRID_TWO_COLUMN_MIN_REM = 2 * WIDGET_GRID_MIN_CELL_REM + HOME_GAP_REM;

/**
 * Columns that fit a container of the given pixel width. Multi-column widget
 * boards prefer even track counts because medium/large widgets are 2-wide;
 * odd counts create awkward transitional rows and edge-hugging 1x1 stragglers.
 */
export function gridColumns(widthPx: number, rem = rootRemPx()): number {
  if (widthPx <= 0) return 1;
  const desktopPx = WIDGET_GRID_FOUR_COLUMN_MIN_REM * rem;
  const twoColumnPx = WIDGET_GRID_TWO_COLUMN_MIN_REM * rem;
  if (widthPx >= desktopPx) return 4;
  if (widthPx >= twoColumnPx) return 2;
  return 1;
}

export function widgetGridWidth(columns: number, rem = rootRemPx()): number {
  const resolvedColumns = Math.max(1, columns);
  return resolvedColumns * HOME_CELL_REM * rem + (resolvedColumns - 1) * HOME_GAP_REM * rem;
}

export function fluidWidgetCellPx(containerWidthPx: number, columns: number, rem = rootRemPx()) {
  const resolvedColumns = Math.max(1, columns);
  const gapPx = widgetGridGapPx(rem);
  return Math.max(0, (containerWidthPx - (resolvedColumns - 1) * gapPx) / resolvedColumns);
}

export function widgetCellPx(containerWidthPx: number, columns: number, rem = rootRemPx()) {
  return fluidWidgetCellPx(containerWidthPx, columns, rem);
}

export function widgetCellCss(_containerWidthPx: number, columns: number, _rem = rootRemPx()) {
  const resolvedColumns = Math.max(1, columns);
  const gapRem = (resolvedColumns - 1) * HOME_GAP_REM;
  return `calc((100% - ${gapRem}rem) / ${resolvedColumns})`;
}

export function widgetGridStyle({
  columns,
  gridWidth = 0,
}: {
  columns: number;
  gridWidth?: number;
}): CSSProperties {
  const resolvedColumns = Math.max(1, columns);
  const fluidCellPx =
    resolvedColumns > 1 && gridWidth > 0 ? widgetCellPx(gridWidth, resolvedColumns) : null;
  const fluidCell = fluidCellPx !== null ? `${fluidCellPx}px` : HOME_CELL;
  const gridColumnCell =
    fluidCellPx !== null ? widgetCellCss(gridWidth, resolvedColumns) : HOME_CELL;

  return {
    "--home-cell": fluidCell,
    gap: HOME_GAP,
    gridAutoRows: "var(--home-cell)",
    gridTemplateColumns:
      resolvedColumns === 1 ? "minmax(0, 1fr)" : `repeat(${resolvedColumns}, ${gridColumnCell})`,
  } as CSSProperties;
}

export function widgetGridOffsetX(containerWidthPx: number, columns: number, rem = rootRemPx()) {
  return Math.max(0, (containerWidthPx - widgetGridWidth(columns, rem)) / 2);
}

export function widgetSpan(size: WidgetSize): GridSpan {
  switch (size) {
    case "large":
      return { cols: 2, rows: 2 };
    case "medium":
      return { cols: 2, rows: 1 };
    default:
      return { cols: 1, rows: 1 };
  }
}

export function widgetSpanFromRect(
  rect: { height: number; width: number },
  cellPx: number,
  gapPx: number,
): GridSpan {
  const stepPx = cellPx + gapPx;
  return {
    cols: Math.max(1, Math.round((rect.width + gapPx) / stepPx)),
    rows: Math.max(1, Math.round((rect.height + gapPx) / stepPx)),
  };
}

/**
 * Sparse row auto-placement — the same model CSS grid uses (grid-auto-flow:
 * row). Each item is placed at the first free block at/after the cursor; the
 * cursor only moves forward, so gaps before it aren't back-filled.
 */
export function flowGrid(spans: GridSpan[], columns: number): GridCell[] {
  const occupied = new Set<string>();
  const isFree = (row: number, col: number, span: GridSpan) => {
    for (let r = row; r < row + span.rows; r++) {
      for (let c = col; c < col + span.cols; c++) {
        if (occupied.has(`${r}:${c}`)) return false;
      }
    }
    return true;
  };
  const mark = (row: number, col: number, span: GridSpan) => {
    for (let r = row; r < row + span.rows; r++) {
      for (let c = col; c < col + span.cols; c++) occupied.add(`${r}:${c}`);
    }
  };

  const cells: GridCell[] = [];
  let cursorRow = 0;
  let cursorCol = 0;
  for (const span of spans) {
    const cols = Math.min(span.cols, columns);
    const footprint = { cols, rows: span.rows };
    let row = cursorRow;
    let col = cursorCol;
    while (true) {
      if (col + cols > columns) {
        row++;
        col = 0;
        continue;
      }
      if (isFree(row, col, footprint)) break;
      col++;
    }
    mark(row, col, footprint);
    cells.push({ col, row });
    cursorRow = row;
    cursorCol = col + cols;
  }
  return cells;
}
