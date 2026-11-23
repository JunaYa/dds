import { useSyncExternalStore } from "react";

const selector = ':is([role="dialog"], [role="alertdialog"]):is([data-open], [data-ending-style])';
function snapshot() { return !!document.querySelector(selector); }
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.body, { subtree: true, childList: true, attributes: true,
    attributeFilter: ["role", "data-open", "data-ending-style"] });
  return () => observer.disconnect();
}
export function useOpenOverlay() { return useSyncExternalStore(subscribe, snapshot, () => false); }
