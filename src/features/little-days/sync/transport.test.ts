import { beforeEach, expect, it, vi } from "vitest";
import { beginAuthorization, pollAuthorization, disconnectProvider, pull } from "./transport";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
beforeEach(() => invoke.mockReset());

it("routes every authorization operation to the chosen provider", async () => {
  invoke.mockResolvedValueOnce({ url: "https://openapi.alipan.com/oauth/qrcode/test", expiresAt: 123 });
  await beginAuthorization("alipan");
  expect(invoke).toHaveBeenLastCalledWith("plugin:cloud-sync|begin_auth", { provider: "alipan" });
  invoke.mockResolvedValueOnce(false);
  expect(await pollAuthorization("alipan")).toBe(false);
  expect(invoke).toHaveBeenLastCalledWith("plugin:cloud-sync|poll_auth", { provider: "alipan" });
  await disconnectProvider("alipan");
  expect(invoke).toHaveBeenLastCalledWith("plugin:cloud-sync|disconnect", { provider: "alipan" });
});
it("rejects invalid authorization responses and account changes", async () => {
  invoke.mockResolvedValueOnce({ url: "invalid", expiresAt: 123 });
  await expect(beginAuthorization("alipan")).rejects.toThrow();
  invoke.mockResolvedValueOnce("true");
  await expect(pollAuthorization("alipan")).rejects.toThrow();
  invoke.mockResolvedValueOnce({ account: "other", snapshots: [] });
  await expect(pull("icloud", "expected")).rejects.toThrow("Cloud account changed");
});
