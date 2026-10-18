import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it } from "vitest";
import { pageFromHash, usePageRoute } from "./page-routing";

it("opens profile child routes directly and falls back for unknown routes", () => {
  expect(pageFromHash("#/profile/backup")).toBe("Backup");
  expect(pageFromHash("#/unknown")).toBe("Today");
  window.history.replaceState(null, "", "#/profile/appearance");
  const { result } = renderHook(usePageRoute);
  expect(result.current[0]).toBe("Appearance");
});
it("keeps history navigation and the rendered page in sync", async () => {
  window.history.replaceState(null, "", "#/profile");
  const { result } = renderHook(usePageRoute);
  act(() => result.current[1]("Backup"));
  expect(window.location.hash).toBe("#/profile/backup");
  expect(result.current[0]).toBe("Backup");
  act(() => window.history.back());
  await waitFor(() => expect(result.current[0]).toBe("My"));
});
