import { Button } from "@vita/ui/button";
import { useApp } from "../hooks/useApp";
import { useI18n } from "../i18n/useI18n";
import { useQuickRecord } from "../quick-record/QuickRecordContext";
import { supportsHaptics } from "../haptics/feedback";
import type { Page } from "../state/workspace-types";

const groups: { title: string; items: { page: Page; title: string; description: string }[] }[] = [
  { title: "Record management", items: [
    { page: "Record types", title: "Record types", description: "Choose and customize what you record." },
    { page: "Supplies", title: "Supplies", description: "Manage supplies and restocking." },
  ] },
  { title: "Preferences", items: [
    { page: "Appearance", title: "Language and appearance", description: "Language, light mode and dark mode." },
    { page: "Interaction", title: "Interaction", description: "Feedback and shortcuts for this device." },
  ] },
  { title: "Data and privacy", items: [
    { page: "Backup", title: "Backup and restore", description: "Import, export, merge and recover your records." },
    { page: "Storage", title: "On this device", description: "Learn where your records are stored." },
  ] },
];
export function My() {
  const { setPage } = useApp();
  const { tr } = useI18n();
  const { status } = useQuickRecord();
  return <div className="profile-groups">
    {groups.map(group => <section className="profile-group" key={group.title} aria-label={tr(group.title)}>
      <h2>{tr(group.title)}</h2>
      <div className="profile-links">
        {group.items.filter(item => item.page !== "Interaction" || supportsHaptics() || status?.supported).map(item =>
          <Button unstyled className="profile-link" aria-label={tr(item.title)} key={item.page} onClick={() => setPage(item.page)}>
            <span><strong>{tr(item.title)}</strong><small>{tr(item.description)}</small></span>
            <span aria-hidden="true">›</span>
          </Button>)}
      </div>
    </section>)}
  </div>;
}
