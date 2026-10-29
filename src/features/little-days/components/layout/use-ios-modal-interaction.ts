import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isIosApp } from "./ios-platform";

export function useIosModalInteraction() {
  useEffect(() => {
    if (!isIosApp()) return;
    const session = crypto.randomUUID();
    let active = false;
    let queue = Promise.resolve();
    const update = (open: boolean) => {
      queue = queue.then(() => invoke<void>("plugin:native-navigation|setModalInteraction", {
        session, active: open,
      })).catch((error: unknown) => {
        console.warn("Could not update native modal interaction", error);
      });
    };
    const synchronize = () => {
      const open = !!document.querySelector(
        ':is([role="dialog"], [role="alertdialog"]):is([data-open], [data-ending-style])',
      );
      if (open === active) return;
      active = open;
      update(open);
    };
    const observer = new MutationObserver(synchronize);
    observer.observe(document.body, {
      subtree: true, childList: true, attributes: true,
      attributeFilter: ["role", "data-open", "data-ending-style"],
    });
    synchronize();
    return () => {
      observer.disconnect();
      update(false);
    };
  }, []);
}
