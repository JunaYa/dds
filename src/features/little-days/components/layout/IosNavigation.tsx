import { useContext, useLayoutEffect, useRef, useState } from "react";
import { Sheet, SheetPopup, SheetTitle, SheetDescription } from "@vita/ui/sheet";
import { type RecordType } from "../../domain/model";
import { RecordTypeChoices } from "../records/RecordTypeChoices";
import { ThemeContext } from "../../state/ThemeContext";
import { Button } from "@vita/ui/button";
import { Icons } from "@vita/ui/icons";
import { useApp } from "../../hooks/useApp";
import { useI18n } from "../../i18n/useI18n";

import { useSystemTabs } from "./use-system-tabs";

const tabs = [
  { page: "Today", label: "Journal", icon: Icons.bookOpen },
  { page: "Analysis", label: "Analysis", icon: Icons.barChart3 },
  { page: "My", label: "Profile", icon: Icons.user },
] as const;

export function IosNavigation() {
  const { tr } = useI18n();
  const theme = useContext(ThemeContext)?.resolved;
  const { page, setPage, modal, nursingOpen, openRecord } = useApp();
  const [choosing, setChoosing] = useState(false);
  const pending = useRef<RecordType | null>(null);
  const selected = page === "Today" || page === "Analysis" ? page : "My";
  const blocked = modal !== null || nursingOpen || choosing || pending.current !== null;
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);
  const native = useSystemTabs(selected, tabs.map(tab => tr(tab.label)), blocked, setPage, theme, {
    title: tr("Add a record"),
    onAdd: () => setChoosing(true),
  });
  return (
    <>
    <nav className="ios-bottom-navigation" aria-label={tr("Main navigation")}
      hidden={blocked || native} data-native={native || undefined}>
      {tabs.map(({ page: target, label, icon: TabIcon }) => (
        <Button unstyled key={target} aria-current={selected === target ? "page" : undefined}
          onClick={() => setPage(target)}>
          <TabIcon aria-hidden="true" />
          <span>{tr(label)}</span>
        </Button>
      ))}
    </nav>
    <Sheet open={choosing} onOpenChange={setChoosing} onOpenChangeComplete={open => {
      if (!open && pending.current) {
        const type = pending.current;
        pending.current = null;
        openRecord(type);
      }
    }}>
      <SheetPopup side="bottom" className="ios-record-chooser" finalFocus={false}
        closeProps={{ "aria-label": tr("Cancel") }}>
        <SheetTitle>{tr("Capture a little moment")}</SheetTitle>
        <SheetDescription>{tr("Choose a record to get started")}</SheetDescription>
        <RecordTypeChoices onPick={type => { pending.current = type; setChoosing(false); }} />
      </SheetPopup>
    </Sheet>
    </>
  );
}
