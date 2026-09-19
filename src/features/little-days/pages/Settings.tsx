import { ThemePicker } from "../components/settings/ThemePicker";

export function Settings() {
  return (
    <div className="settings-page">
      <section className="settings-section"><ThemePicker /></section>
      <section className="settings-section settings-storage" aria-labelledby="settings-storage-heading">
        <div><h2 id="settings-storage-heading">On this device</h2><p>Your appearance preference is shared across child profiles on this device.</p></div>
        <p>Care records stay here, too. There is no cloud sync yet. Clearing app data or uninstalling removes your records.</p>
      </section>
    </div>
  );
}
