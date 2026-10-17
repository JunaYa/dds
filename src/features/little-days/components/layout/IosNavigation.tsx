import { useContext, useLayoutEffect } from "react";
import { ThemeContext } from "../../state/ThemeContext";
import { Button } from "@vita/ui/button";
import { Icons } from "@vita/ui/icons";
import { useApp } from "../../hooks/useApp";
import { useI18n } from "../../i18n/useI18n";

import { useSystemTabs } from "./use-system-tabs";

const tabs = [
  { page: "Today", label: "Home records", icon: Icons.bookOpen },
  { page: "Analysis", label: "Analysis", icon: Icons.barChart3 },
  { page: "My", label: "My", icon: Icons.user },
] as const;

export function IosNavigation() {
  const { tr } = useI18n();
  const theme = useContext(ThemeContext)?.resolved;
  const { page, setPage, modal, nursingOpen } = useApp();
  const selected = page === "Today" || page === "Analysis" ? page : "My";
  const blocked = modal !== null || nursingOpen;
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);
  const native = useSystemTabs(selected, tabs.map(tab => tr(tab.label)), blocked, setPage, theme);
  return (
    <nav className="ios-bottom-navigation" aria-label={tr("Main navigation")}
      hidden={blocked || native}>
      {tabs.map(({ page: target, label, icon: TabIcon }) => (
        <Button unstyled key={target} aria-current={selected === target ? "page" : undefined}
          onClick={() => setPage(target)}>
          <TabIcon aria-hidden="true" />
          <span>{tr(label)}</span>
        </Button>
      ))}
    </nav>
  );
}
