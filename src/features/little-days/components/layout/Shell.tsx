import { type ReactNode } from "react";
import { Button } from "@vita/ui/button";
import { useApp } from "../../hooks/useApp";
import { PageNavigation } from "./PageNavigation";
import { MobileNavigation } from "./MobileNavigation";
import { Icon } from "../common/Icon";
import { NursingTimer } from "../nursing/NursingTimer";
import { NursingMiniBar } from "../nursing/NursingMiniBar";
import { ChildPicker } from "../children/ChildPicker";
import { SaveError } from "../common/SaveError";
import { SessionBanner } from "../timers/SessionBanner";
import { WorkspaceModal } from "../dialogs/WorkspaceModal";


export function Shell({ children }: { children: ReactNode }) {
  const a = useApp();
  if (!a.activeChild) return null;
  return (
    <>
      <div className="app-frame">
        <aside className="sidebar">
          <div className="brand">
            <Icon name="leaf" size={27} />
            <strong>
              little days<span>A little less to remember</span>
            </strong>
          </div>
          <ChildPicker />
          <PageNavigation />
          <div className="side-note">
            <span className="tiny-title">THE LITTLE THINGS ADD UP</span>
            <p>
              A bottle, a nap, a fresh diaper.
              <br />
              One day at a time.
            </p>
            <span>Stored on this device</span>
          </div>
        </aside>
        <main>
          <MobileNavigation />
          <header className="page-heading">
            <div>
              <div className="eyebrow">
                {new Date(`${a.day}T12:00`).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}{" "}
                <span>•</span> {a.activeChild.age}
              </div>
              <h1>
                {a.page === "Today"
                  ? `${a.activeChild.name}’s little day`
                  : a.page === "Supplies"
                    ? "Ready for the everyday."
                    : a.page === "Settings" ? "Make yourself at home." : "Make room for your routine."}
              </h1>
              <p>
                {a.page === "Today"
                  ? a.activeChild.caption
                  : a.page === "Supplies"
                    ? "Family supplies, with one less thing to keep in your head."
                    : a.page === "Settings" ? "Small preferences for your everyday." : "Choose what matters. Build a record that fits."}
              </p>
            </div>
            {a.page === "Today" ? (
              <Button
                className="primary"
                onClick={() => a.openRecord(a.types[0])}
              >
                ＋ Add a record
              </Button>
            ) : a.page !== "Settings" ? (
              <Button
                className="primary"
                onClick={() =>
                  a.setModal({
                    kind: a.page === "Supplies" ? "supply" : "type",
                  })
                }
              >
                ＋ {a.page === "Supplies" ? "Add supply" : "Create record type"}
              </Button>
            ) : null}
          </header>
          <SaveError />
          <SessionBanner />
          {children}
          <div className="notice" role="status">
            {a.notice}
            {a.undo && <button onClick={a.undo}>Undo</button>}
          </div>
          <footer className="app-footer">
            Saved on this device · No cloud sync
          </footer>
        </main>
      </div>
      <WorkspaceModal />
      <NursingMiniBar />
      <NursingTimer />
    </>
  );
}
