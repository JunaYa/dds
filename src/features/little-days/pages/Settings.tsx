import { Button } from "@vita/ui/button";
import { useApp } from "../hooks/useApp";
import { HapticSettings } from "../haptics/HapticFeedback";
import { BackupSettings } from "../backup/BackupSettings";
import { LanguagePicker } from "../components/settings/LanguagePicker";
import { useI18n } from "../i18n/useI18n";
import { ThemePicker } from "../components/settings/ThemePicker";
import { ShortcutSettings } from "../quick-record/ShortcutSettings";

export function Settings({ section }: { section?: "Appearance" | "Interaction" | "Backup" | "Storage" }) {
  const { tr } = useI18n();
  const { setPage } = useApp();
  return (
    <div className="settings-page">
      {!section && <Button variant="outline" onClick={() => setPage("Cloud")}>{tr("Cloud sync")}</Button>}
      {(!section || section === "Interaction") && <ShortcutSettings />}
      {(!section || section === "Interaction") && <HapticSettings />}
      {(!section || section === "Backup") && <BackupSettings />}
      {(!section || section === "Appearance") && <section className="settings-section">
        <LanguagePicker />
      </section>}
      {(!section || section === "Appearance") && <section className="settings-section">
        <ThemePicker />
      </section>}
      {(!section || section === "Storage") && <section
        className="settings-section settings-storage"
        aria-labelledby="settings-storage-heading"
      >
        <div>
          <h2 id="settings-storage-heading">{tr("On this device")}</h2>
          <p>
            {tr(
              "Your appearance preference is shared across child profiles on this device.",
            )}
          </p>
        </div>
        <p>
          {tr(
            "Records are stored on this device. Optional cloud sync is managed separately in Profile. Export a backup before clearing app data or uninstalling.",
          )}
        </p>
      </section>}
    </div>
  );
}
