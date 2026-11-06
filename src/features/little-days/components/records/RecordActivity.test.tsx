import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import type { CareRecord } from "../../domain/model";
import { RecordActivity } from "./RecordActivity";
import { LOCALE_KEY } from "../../storage/locale";

function record(id: string, time: string): CareRecord {
  return { id, child: "baby", type: "feed", time, note: "", values: {} };
}

it("counts only the last 90 local dates, includes empty days and updates from changed records", () => {
  localStorage.clear();
  const records = [record("a", "2027-01-01T00:00"), record("b", "2027-01-01T23:59"), record("c", "2026-10-04T12:00"), record("old", "2026-10-03T23:59"), record("future", "2027-01-02T00:00")];
  const view = render(<LocaleProvider><RecordActivity records={records} day="2027-01-01" /></LocaleProvider>);
  expect(screen.getByText("3 saved records across 2 days in the last 90 days.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Show daily details" }));
  const rows = within(screen.getByRole("table")).getAllByRole("row");
  expect(rows).toHaveLength(91);
  expect(within(rows[1]).getByRole("cell")).toHaveTextContent("2");
  expect(within(rows[2]).getByRole("cell")).toHaveTextContent("0");
  expect(within(rows[90]).getByRole("cell")).toHaveTextContent("1");
  view.rerender(<LocaleProvider><RecordActivity records={[]} day="2027-01-01" /></LocaleProvider>);
  expect(screen.getByText("0 saved records across 0 days in the last 90 days.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Hide daily details" }));
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
});

it("exposes Chinese summaries and daily counts without relying on color", () => {
  localStorage.clear();
  localStorage.setItem(LOCALE_KEY, "zh-CN");
  render(<LocaleProvider><RecordActivity records={[record("a", "2027-01-01T12:00")]} day="2027-01-01" /></LocaleProvider>);
  expect(screen.getByRole("heading", { name: "记录足迹" })).toBeInTheDocument();
  expect(screen.getByText("最近 90 天，已保存 1 条记录，覆盖 1 天。")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "查看每日明细" }));
  expect(screen.getByRole("columnheader", { name: "日期" })).toBeInTheDocument();
  expect(within(within(screen.getByRole("table")).getAllByRole("row")[1]).getByRole("cell")).toHaveTextContent("1");
  localStorage.clear();
});
