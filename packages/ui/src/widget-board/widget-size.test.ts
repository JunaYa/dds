import { describe, expect, it } from "vitest";
import { nextSize, sizeSpanClass, tileSizeStyle } from "./widget-size.ts";

describe("sizeSpanClass", () => {
  it("maps each square-cell preset to its multi-column grid span", () => {
    expect(sizeSpanClass("small")).toBe("col-span-1 row-span-1");
    expect(sizeSpanClass("medium")).toBe("col-span-2 row-span-1");
    expect(sizeSpanClass("large")).toBe("col-span-2 row-span-2");
  });

  it("keeps wide presets in one column when the measured grid has one column", () => {
    expect(sizeSpanClass("small", true)).toBe("col-span-1 row-span-1");
    expect(sizeSpanClass("medium", true)).toBe("col-span-1 row-span-1");
    expect(sizeSpanClass("large", true)).toBe("col-span-1 row-span-2");
  });
});

describe("tileSizeStyle", () => {
  it("gives wide sizes a two-cell width on a multi-column panel", () => {
    const two = "calc(2 * 10rem + 0.75rem)";
    expect(tileSizeStyle("small")).toEqual({ width: "10rem", height: "10rem" });
    expect(tileSizeStyle("medium")).toEqual({ width: two, height: "10rem" });
    expect(tileSizeStyle("large")).toEqual({ width: two, height: two });
  });

  it("keeps preset heights when wide sizes render in one column", () => {
    const two = "calc(2 * 10rem + 0.75rem)";
    expect(tileSizeStyle("medium", true)).toEqual({ width: "10rem", height: "10rem" });
    expect(tileSizeStyle("large", true)).toEqual({ width: "10rem", height: two });
  });

  it("uses the measured grid width for one-column drag overlays", () => {
    const two = "calc(2 * 10rem + 0.75rem)";
    expect(tileSizeStyle("small", true, 280)).toEqual({ width: "280px", height: "10rem" });
    expect(tileSizeStyle("medium", true, 280)).toEqual({ width: "280px", height: "10rem" });
    expect(tileSizeStyle("large", true, 280)).toEqual({ width: "280px", height: two });
  });
});

describe("nextSize", () => {
  it("cycles to the next allowed size and wraps around", () => {
    expect(nextSize(["small", "medium", "large"], "small")).toBe("medium");
    expect(nextSize(["small", "medium", "large"], "large")).toBe("small");
  });

  it("returns the same size when only one is allowed", () => {
    expect(nextSize(["medium"], "medium")).toBe("medium");
  });

  it("falls back to the first allowed size when current is not in the list", () => {
    expect(nextSize(["small", "large"], "medium")).toBe("small");
  });
});
