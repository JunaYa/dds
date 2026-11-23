import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it } from "vitest";
import { useOpenOverlay } from "./use-open-overlay";

it("holds navigation blocked across nested dialogs and the last exit animation", async () => {
  const { result, unmount } = renderHook(useOpenOverlay);
  const dialog = document.createElement("div"), alert = document.createElement("div");
  dialog.setAttribute("role", "dialog"); dialog.setAttribute("data-open", "");
  alert.setAttribute("role", "alertdialog"); alert.setAttribute("data-open", "");
  try {
    act(() => document.body.append(dialog, alert));
    await waitFor(() => expect(result.current).toBe(true));
    act(() => dialog.remove());
    act(() => { alert.removeAttribute("data-open"); alert.setAttribute("data-ending-style", ""); });
    await act(async () => {});
    expect(result.current).toBe(true);
    act(() => alert.remove());
    await waitFor(() => expect(result.current).toBe(false));
  } finally { dialog.remove(); alert.remove(); unmount(); }
});
