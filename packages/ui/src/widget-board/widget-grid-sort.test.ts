import { describe, expect, it } from "vitest";
import {
  flowGrid,
  fluidWidgetCellPx,
  gridColumns,
  widgetCellCss,
  widgetCellPx,
  widgetGridGapPx,
  widgetGridOffsetX,
  widgetGridWidth,
  widgetSpanFromRect,
} from "./widget-grid-geometry.ts";

describe("flowGrid", () => {
  it("packs mixed-span tiles with sparse row flow (the default home layout)", () => {
    // Representative mixed spans from the original widget packing model.
    const cells = flowGrid(
      [
        { cols: 2, rows: 1 },
        { cols: 2, rows: 1 },
        { cols: 2, rows: 1 },
        { cols: 2, rows: 1 },
        { cols: 1, rows: 1 },
      ],
      4,
    );
    expect(cells).toEqual([
      { col: 0, row: 0 },
      { col: 2, row: 0 },
      { col: 0, row: 1 },
      { col: 2, row: 1 },
      { col: 0, row: 2 },
    ]);
  });

  it("wraps to the next row when a tile does not fit the remaining columns", () => {
    const cells = flowGrid(
      [
        { cols: 2, rows: 1 },
        { cols: 2, rows: 1 },
      ],
      2,
    );
    expect(cells).toEqual([
      { col: 0, row: 0 },
      { col: 0, row: 1 },
    ]);
  });

  it("routes a 1×1 into the gap beside a row-spanning tile", () => {
    // large 2×2 then small 1×1, 3 columns: small tucks into (0,2)
    const cells = flowGrid(
      [
        { cols: 2, rows: 2 },
        { cols: 1, rows: 1 },
      ],
      3,
    );
    expect(cells).toEqual([
      { col: 0, row: 0 },
      { col: 2, row: 0 },
    ]);
  });

  it("clamps a tile wider than the grid to the column count", () => {
    expect(flowGrid([{ cols: 2, rows: 1 }], 1)).toEqual([{ col: 0, row: 0 }]);
  });
});

describe("gridColumns", () => {
  it("uses responsive 4 / 2 / 1 column bands", () => {
    expect(gridColumns(640)).toBe(4);
    expect(gridColumns(500)).toBe(2);
    expect(gridColumns(314)).toBe(2);
    expect(gridColumns(150)).toBe(1);
  });

  it("prefers even multi-column counts for two-wide widget composition", () => {
    expect(gridColumns(520)).toBe(2);
    expect(gridColumns(639)).toBe(2);
  });

  it("caps wide boards at the documented four-column desktop layout", () => {
    expect(gridColumns(1280)).toBe(4);
  });

  it("never returns fewer than one column", () => {
    expect(gridColumns(0)).toBe(1);
  });
});

describe("widget grid geometry", () => {
  it("computes fixed track width and centering offset", () => {
    // 4 * 160px cells + 3 * 12px gaps = 676px at the default 16px root rem.
    expect(widgetGridWidth(4, 16)).toBe(676);
    expect(widgetGridOffsetX(800, 4, 16)).toBe(62);
  });

  it("expands cell width to fill the active content container", () => {
    // (1280px - 5 * 12px gaps) / 6 columns = 203.333px cells.
    expect(fluidWidgetCellPx(1280, 6, 16)).toBeCloseTo(203.333, 3);
  });

  it("lets two-column widgets expand to fill the container", () => {
    expect(fluidWidgetCellPx(600, 2, 16)).toBe(294);
    expect(widgetCellPx(600, 2, 16)).toBe(294);
  });

  it("generates a container-fit cell expression for shell transitions", () => {
    expect(widgetCellCss(600, 2, 16)).toBe("calc((100% - 0.75rem) / 2)");
  });

  it("fills the wide home container with four columns and 12px gutters", () => {
    expect(widgetCellPx(1024, 4, 16)).toBe(247);
    expect(widgetCellCss(1024, 4, 16)).toBe("calc((100% - 2.25rem) / 4)");
  });

  it("keeps wide-content cells fluid below the cap", () => {
    expect(widgetCellPx(1280, 6, 16)).toBeCloseTo(203.333, 3);
  });

  it("infers spans from the rendered fluid cell, not the fixed base cell", () => {
    const gap = widgetGridGapPx(16);
    const cell = widgetCellPx(1280, 6, 16);
    const rect = {
      width: 2 * cell + gap,
      height: cell,
    };

    expect(widgetSpanFromRect(rect, cell, gap)).toEqual({ cols: 2, rows: 1 });
  });
});
