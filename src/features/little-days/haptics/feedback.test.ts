import { beforeEach, expect, it, vi } from "vitest";
const native = vi.hoisted(() => ({ invoke: vi.fn().mockResolvedValue(undefined), ios: true }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: native.invoke }));
vi.mock("../components/layout/ios-platform", () => ({ isIosApp: () => native.ios }));
import { feedback, handleInteraction, HAPTICS_KEY, hapticsEnabled, setHapticsEnabled, subscribeHaptics } from "./feedback";
beforeEach(() => {
  localStorage.clear(); native.ios = true; native.invoke.mockClear();
  const unsubscribe = subscribeHaptics(() => {});
  window.dispatchEvent(new StorageEvent("storage", { key: HAPTICS_KEY }));
  unsubscribe();
  vi.spyOn(performance, "now").mockReturnValue(Date.now());
});
it("defaults on, persists off, and does not invoke native feedback when disabled", () => {
  expect(hapticsEnabled()).toBe(true);
  setHapticsEnabled(false);
  expect(localStorage.getItem(HAPTICS_KEY)).toBe("false");
  feedback(); expect(native.invoke).not.toHaveBeenCalled();
});
it("uses the iOS bridge and throttles repeated interaction feedback", () => {
  feedback(); feedback();
  expect(native.invoke).toHaveBeenCalledTimes(1);
  expect(native.invoke).toHaveBeenCalledWith("plugin:native-navigation|hapticFeedback");
});
it("keeps disabling effective when storage fails", () => {
  const failing = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw Error("quota"); });
  expect(setHapticsEnabled(false)).toBe(false);
  expect(hapticsEnabled()).toBe(false);
  feedback(); expect(native.invoke).not.toHaveBeenCalled();
  failing.mockRestore();
});
it("does not vibrate on unsupported desktop or synthetic clicks", () => {
  native.ios = false; feedback();
  handleInteraction(new MouseEvent("click"));
  expect(native.invoke).not.toHaveBeenCalled();
});
it("updates subscribers when a different window clears the preference", () => {
  setHapticsEnabled(false);
  const listener = vi.fn(); const unsubscribe = subscribeHaptics(listener);
  localStorage.clear(); window.dispatchEvent(new StorageEvent("storage", { key: null }));
  expect(hapticsEnabled()).toBe(true); expect(listener).toHaveBeenCalledOnce();
  unsubscribe();
});
