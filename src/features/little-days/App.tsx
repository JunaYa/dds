import { ThemeProvider } from "./state/ThemeProvider";
import { Settings } from "./pages/Settings";
import Focus from "./pages/Focus";
import { WorkspaceProvider } from "./state/WorkspaceProvider";
import { useApp } from "./hooks/useApp";
import { ChildForm } from "./components/children/ChildForm";
import { SaveError } from "./components/common/SaveError";
import { Icon } from "./components/common/Icon";

function Workspace() {
  const { data, activeChild, page, setPage } = useApp();
  if (!activeChild && page === "Settings") return (
    <main className="onboarding onboarding-settings">
      <button className="settings-back" onClick={() => setPage("Today")}>← Back</button>
      <h1>Settings</h1>
      <Settings />
    </main>
  );
  if (!data)
    return (
      <main className="onboarding">
        <h1>Your records are still on this device.</h1>
        <SaveError />
        <button onClick={() => location.reload()}>Try again</button>
      </main>
    );
  if (!activeChild)
    return (
      <main className="onboarding">
        <button className="onboarding-settings-link" onClick={() => setPage("Settings")}>Settings</button>
        <Icon name="leaf" size={36} />
        <p className="eyebrow">LITTLE DAYS</p>
        <h1>A little less to remember.</h1>
        <p>
          Start with your child. Keep feeding, sleep, changes, and the little
          things together.
        </p>
        <SaveError />
        <ChildForm />
        <p className="privacy-note">
          Saved only on this device. No account needed.
        </p>
      </main>
    );
  return <Focus />;
}
export default function LittleDays() {
  return (
    <ThemeProvider>
      <WorkspaceProvider>
        <Workspace />
      </WorkspaceProvider>
    </ThemeProvider>
  );
}
