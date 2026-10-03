import { Button } from "@vita/ui/button";
import { LocaleProvider } from "./i18n/LocaleProvider";
import { useI18n } from "./i18n/useI18n";
import { ThemeProvider } from "./state/ThemeProvider";
import { Settings } from "./pages/Settings";
import Focus from "./pages/Focus";
import { WorkspaceProvider } from "./state/WorkspaceProvider";
import { useApp } from "./hooks/useApp";
import { ChildForm } from "./components/children/ChildForm";
import { SaveError } from "./components/common/SaveError";
import { Icon } from "./components/common/Icon";

function Workspace() {
  const { tr } = useI18n();
  const { data, activeChild, page, setPage } = useApp();
  if (!activeChild && page === "Settings")
    return (
      <main className="onboarding onboarding-settings">
        <Button
          unstyled
          className="settings-back"
          onClick={() => setPage("Today")}
        >
          {tr("← Back")}
        </Button>
        <h1>{tr("Settings")}</h1>
        <Settings />
      </main>
    );
  if (!data)
    return (
      <main className="onboarding">
        <h1>{tr("Your records are still on this device.")}</h1>
        <SaveError />
        <Button unstyled onClick={() => location.reload()}>
          {tr("Try again")}
        </Button>
      </main>
    );
  if (!activeChild)
    return (
      <main className="onboarding">
        <Button
          unstyled
          className="onboarding-settings-link"
          onClick={() => setPage("Settings")}
        >
          {tr("Settings")}
        </Button>
        <Icon name="leaf" size={36} />
        <p className="eyebrow">LITTLE DAYS</p>
        <h1>{tr("A little less to remember.")}</h1>
        <p>
          {tr(
            "Start with your child. Keep feeding, sleep, changes, and the little things together.",
          )}
        </p>
        <SaveError />
        <ChildForm />
        <p className="privacy-note">
          {tr("Saved only on this device. No account needed.")}
        </p>
      </main>
    );
  return <Focus />;
}
export default function LittleDays() {
  return (
    <LocaleProvider>
      <ThemeProvider>
        <WorkspaceProvider>
          <Workspace />
        </WorkspaceProvider>
      </ThemeProvider>
    </LocaleProvider>
  );
}
