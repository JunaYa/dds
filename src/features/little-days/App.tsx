import Focus from "./Focus";
import { WorkspaceProvider, useApp } from "./store";
import { ChildForm } from "./forms";
import { SaveError } from "./shared";
import { Icon } from "./icon";
function Workspace() {
  const { data, activeChild } = useApp();
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
    <WorkspaceProvider>
      <Workspace />
    </WorkspaceProvider>
  );
}
