import { HapticSettings } from "../haptics/HapticFeedback";
import { BackupSettings } from "../backup/BackupSettings";
import { LanguagePicker } from "../components/settings/LanguagePicker";
import { useI18n } from "../i18n/useI18n";
import { ThemePicker } from "../components/settings/ThemePicker";
import { ShortcutSettings } from "../quick-record/ShortcutSettings";

export function Settings({ section }: { section?: "Appearance" | "Interaction" | "Backup" | "Storage" }) {
  const { tr } = useI18n();
  return (
    <div className="settings-page">
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
            "Care records stay here, too. There is no cloud sync yet. Clearing app data or uninstalling removes your records.",
          )}
        </p>
      </section>}
    </div>
  );
}
