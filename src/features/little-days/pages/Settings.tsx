import { LanguagePicker } from "../components/settings/LanguagePicker";
import { useI18n } from "../i18n/useI18n";
import { ThemePicker } from "../components/settings/ThemePicker";

export function Settings() {
  const { tr } = useI18n();
  return (
    <div className="settings-page">
      <section className="settings-section">
        <LanguagePicker />
      </section>
      <section className="settings-section">
        <ThemePicker />
      </section>
      <section
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
      </section>
    </div>
  );
}
