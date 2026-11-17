import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import catalog from "../../../../public/audio/pixabay-catalog.json";
import { PixabayResources } from "./PixabayResources";
vi.mock("../i18n/useI18n", () => ({ useI18n: () => ({ tr: (text: string) => text }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("filters source-only resources by category without playback controls", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => catalog }));
  const view = render(<PixabayResources category="sleep" />);
  await screen.findByText("Moonlight Cradle");
  expect(screen.queryByText("Kids Baby Children Music")).not.toBeInTheDocument();
  expect(screen.getAllByRole("link")).toHaveLength(3);
  expect(screen.queryByRole("button", { name: "Play" })).not.toBeInTheDocument();
  view.rerender(<PixabayResources category="songs" />);
  expect(screen.getByText("Kids Baby Children Music")).toBeInTheDocument();
  expect(screen.queryByText("Moonlight Cradle")).not.toBeInTheDocument();
});
it("allows retry after a failed local request", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("failed")).mockResolvedValueOnce({ ok: true, json: async () => catalog }));
  render(<PixabayResources category="sleep" />);
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await screen.findByText("Moonlight Cradle");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
