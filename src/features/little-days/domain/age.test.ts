import { describe, expect, it } from "vitest";
import { calculateAge, formatAge } from "./age";
import { translator } from "../i18n/translate";

const at = (day: string) => new Date(`${day}T12:00`);
const zh = translator("zh-CN");

describe("age display stages", () => {
  it.each([
    ["2026-01-01", "0 天", "0 days"],
    ["2026-01-02", "1 天", "1 day"],
    ["2026-01-31", "30 天", "30 days"],
    ["2026-02-01", "1 个月", "1 month"],
    ["2026-02-02", "1 个月 1 天", "1 month, 1 day"],
    ["2026-03-31", "2 个月 30 天", "2 months, 30 days"],
    ["2026-04-01", "3 个月", "3 months"],
    ["2026-04-07", "3 个月", "3 months"],
    ["2026-04-08", "3 个月 1 周", "3 months, 1 week"],
    ["2026-04-15", "3 个月 2 周", "3 months, 2 weeks"],
    ["2026-06-30", "5 个月 4 周", "5 months, 4 weeks"],
    ["2026-07-01", "6 个月", "6 months"],
    ["2027-01-01", "12 个月", "12 months"],
    ["2027-12-31", "23 个月", "23 months"],
    ["2028-01-01", "2 岁", "2 years"],
    ["2028-02-01", "2 岁 1 个月", "2 years, 1 month"],
    ["2031-12-31", "5 岁 11 个月", "5 years, 11 months"],
    ["2032-01-01", "6 岁", "6 years"],
    ["2032-08-31", "6 岁", "6 years"],
  ])("formats at %s", (day, chinese, english) => {
    expect(formatAge("2026-01-01", at(day), zh)).toBe(chinese);
    expect(formatAge("2026-01-01", at(day))).toBe(english);
  });
});

describe("calendar age", () => {
  it("clamps month anniversaries to the last day without accumulating drift", () => {
    expect(calculateAge("2026-01-31", at("2026-02-27"))).toEqual({ months: 0, days: 27 });
    expect(calculateAge("2026-01-31", at("2026-02-28"))).toEqual({ months: 1, days: 0 });
    expect(calculateAge("2026-01-31", at("2026-03-01"))).toEqual({ months: 1, days: 1 });
    expect(calculateAge("2026-01-31", at("2026-03-30"))).toEqual({ months: 1, days: 30 });
    expect(calculateAge("2026-01-31", at("2026-03-31"))).toEqual({ months: 2, days: 0 });
  });
  it("handles leap days and year boundaries", () => {
    expect(calculateAge("2024-02-29", at("2024-03-28"))).toEqual({ months: 0, days: 28 });
    expect(calculateAge("2024-02-29", at("2025-02-28"))).toEqual({ months: 12, days: 0 });
    expect(calculateAge("2025-12-20", at("2026-01-22"))).toEqual({ months: 1, days: 2 });
  });
  it("uses local calendar days rather than elapsed hours", () => {
    expect(calculateAge("2026-03-07", new Date(2026, 2, 9, 0, 1))).toEqual({ months: 0, days: 2 });
    expect(calculateAge("2026-03-07", new Date(2026, 2, 9, 23, 59))).toEqual({ months: 0, days: 2 });
  });
  it("does not show negative or invalid ages", () => {
    expect(formatAge("2027-01-01", at("2026-01-01"), zh)).toBe("0 天");
    expect(calculateAge("2026-02-30", at("2026-03-01"))).toBeNull();
    expect(calculateAge("bad", at("2026-03-01"))).toBeNull();
    expect(calculateAge("2026-01-01", new Date(NaN))).toBeNull();
    expect(formatAge("bad", at("2026-03-01"), zh)).toBe("暂无年龄");
  });
});
