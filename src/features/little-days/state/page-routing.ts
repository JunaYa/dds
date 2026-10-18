import { useCallback, useEffect, useState } from "react";
import type { Page } from "./workspace-types";

export const pagePaths: Record<Page, string> = {
  Today: "/journal", Analysis: "/analysis", My: "/profile",
  Supplies: "/profile/supplies", "Record types": "/profile/record-types",
  Settings: "/settings", Appearance: "/profile/appearance",
  Interaction: "/profile/interaction", Backup: "/profile/backup", Storage: "/profile/storage", Cloud: "/profile/cloud",
};
export function pageFromHash(hash: string): Page {
  return (Object.keys(pagePaths) as Page[]).find(page => `#${pagePaths[page]}` === hash) ?? "Today";
}
export function isProfileDetail(page: Page) {
  return pagePaths[page].startsWith("/profile/");
}
export function usePageRoute() {
  const [page, updatePage] = useState<Page>(() => pageFromHash(window.location.hash));
  useEffect(() => {
    const sync = () => updatePage(pageFromHash(window.location.hash));
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => { window.removeEventListener("popstate", sync); window.removeEventListener("hashchange", sync); };
  }, []);
  const setPage = useCallback((next: Page) => {
    const hash = `#${pagePaths[next]}`;
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    updatePage(next);
  }, []);
  return [page, setPage] as const;
}
