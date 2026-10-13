import type { ClientRect } from "@dnd-kit/core";
import { arrayMove, type SortingStrategy } from "@dnd-kit/sortable";
import {
  flowGrid,
  type GridCell,
  type GridSpan,
  rootRemPx,
  widgetGridGapPx,
  widgetSpanFromRect,
} from "./widget-grid-geometry.ts";
import { HOME_CELL_REM } from "./widget-size.ts";

interface PassLayout {
  cells: GridCell[];
  originLeft: number;
  originTop: number;
  /** original item index → its position in the reordered flow */
  posByIndex: number[];
  stepPx: number;
}

// Geometry + flow depend only on (rects, activeIndex, overIndex); dnd-kit calls
// the strategy once per tile with those fixed, so compute the layout once per
// pass and reuse it — no getComputedStyle / clientWidth / flow sim per tile.
function computeLayout(
  rects: ClientRect[],
  activeIndex: number,
  overIndex: number,
  columns: number,
  cellPx: number,
): PassLayout {
  const rem = rootRemPx();
  const gapPx = widgetGridGapPx(rem);
  const stepPx = cellPx + gapPx;

  let originLeft = Number.POSITIVE_INFINITY;
  let originTop = Number.POSITIVE_INFINITY;
  for (const rect of rects) {
    if (rect.left < originLeft) originLeft = rect.left;
    if (rect.top < originTop) originTop = rect.top;
  }

  // Footprints from the measured rects, so a full-width one-column tile counts
  // as its rendered mobile span.
  const spans: GridSpan[] = rects.map((rect) => widgetSpanFromRect(rect, cellPx, gapPx));

  const order = arrayMove(
    rects.map((_, i) => i),
    activeIndex,
    overIndex,
  );
  const cells = flowGrid(
    order.map((i) => spans[i] as GridSpan),
    columns,
  );
  const posByIndex: number[] = [];
  order.forEach((original, pos) => {
    posByIndex[original] = pos;
  });

  return { cells, originLeft, originTop, posByIndex, stepPx };
}

/**
 * Grid-aware sortable strategy: keeps every tile in the DOM (stable rects →
 * responsive `over`, no reorder/re-measure loop) and returns each tile's
 * transform to the cell it would occupy once the active tile lands on the
 * hovered slot — simulating the real square-cell flow so variable-span tiles
 * (1×1 / 2×1 / 2×2) part cleanly instead of overlapping.
 */
export function gridSortingStrategy(
  getColumns: () => number,
  getCellPx: () => number = () => HOME_CELL_REM * rootRemPx(),
): SortingStrategy {
  let cacheKey: string | null = null;
  let cacheRects: ClientRect[] | null = null;
  let layout: PassLayout | null = null;

  return ({ rects, activeIndex, overIndex, index }) => {
    if (activeIndex === overIndex || activeIndex < 0 || overIndex < 0) return null;

    const key = `${activeIndex}:${overIndex}`;
    if (!layout || cacheKey !== key || cacheRects !== rects) {
      const columns = Math.max(1, getColumns());
      const measuredCellPx = getCellPx();
      const fallbackCellPx = HOME_CELL_REM * rootRemPx();
      const cellPx =
        Number.isFinite(measuredCellPx) && measuredCellPx > 0 ? measuredCellPx : fallbackCellPx;
      layout = computeLayout(rects, activeIndex, overIndex, columns, cellPx);
      cacheKey = key;
      cacheRects = rects;
    }

    const cell = layout.cells[layout.posByIndex[index] ?? -1];
    const current = rects[index];
    if (!(cell && current)) return null;

    return {
      x: layout.originLeft + cell.col * layout.stepPx - current.left,
      y: layout.originTop + cell.row * layout.stepPx - current.top,
      scaleX: 1,
      scaleY: 1,
    };
  };
}
