import { invoke } from "@tauri-apps/api/core";
import { isIosApp } from "../components/layout/ios-platform";

export const HAPTICS_KEY = "little-days.haptics";
const changed = "little-days-haptics-changed";
let sessionPreference: boolean | undefined;
let lastFeedback = -Infinity;
export function hapticsEnabled() {
  if (sessionPreference !== undefined) return sessionPreference;
  try { return localStorage.getItem(HAPTICS_KEY) !== "false"; }
  catch { return true; }
}
export function supportsHaptics() {
  return isIosApp() || (/Android/i.test(navigator.userAgent) && typeof navigator.vibrate === "function");
}
export function subscribeHaptics(listener: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === HAPTICS_KEY || event.key === null) { sessionPreference = undefined; listener(); }
  };
  window.addEventListener(changed, listener);
  window.addEventListener("storage", storage);
  return () => { window.removeEventListener(changed, listener); window.removeEventListener("storage", storage); };
}
export function setHapticsEnabled(enabled: boolean) {
  sessionPreference = enabled;
  let saved = true;
  try { localStorage.setItem(HAPTICS_KEY, String(enabled)); } catch { saved = false; }
  window.dispatchEvent(new Event(changed));
  return saved;
}
export function feedback() {
  if (!hapticsEnabled() || !supportsHaptics() || document.visibilityState === "hidden") return;
  const now = performance.now();
  if (now - lastFeedback < 80) return;
  lastFeedback = now;
  if (isIosApp()) {
    void invoke("plugin:native-navigation|hapticFeedback").catch(() => { /* Haptics are optional on this device. */ });
  } else {
    try { navigator.vibrate(10); } catch { /* Some WebViews disable vibration. */ }
  }
}
export function handleInteraction(event: MouseEvent) {
  if (!event.isTrusted || !(event.target instanceof Element)) return;
  const control = event.target.closest('button, [role="button"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"], input[type="checkbox"], input[type="radio"]');
  if (!control || control.closest('[data-haptics="off"], [inert]') || control.matches(':disabled, [aria-disabled="true"]')) return;
  feedback();
}
