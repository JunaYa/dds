import { useI18n } from "../../i18n/LocaleProvider";
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
  const { tr, locale } = useI18n();
  const a = useApp();
  if (!a.activeChild) return null;
  return (
    <>
      <div className="app-frame">
        <aside className="sidebar">
          <div className="brand">
            <Icon name="leaf" size={27} />
            <strong>
              little days<span>{tr("A little less to remember")}</span>
            </strong>
          </div>
          <ChildPicker />
          <PageNavigation />
          <div className="side-note">
            <span className="tiny-title">{tr("THE LITTLE THINGS ADD UP")}</span>
            <p>
              {tr("A bottle, a nap, a fresh diaper.")}
              <br />
              {tr("One day at a time.")}
            </p>
            <span>{tr("Stored on this device")}</span>
          </div>
        </aside>
        <main>
          <MobileNavigation />
          <header className="page-heading">
            <div>
              <div className="eyebrow">
                {new Date(`${a.day}T12:00`).toLocaleDateString(locale, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}{" "}
                <span>•</span> {a.activeChild.age}
              </div>
              <h1>
                {a.page === "Today"
                  ? tr("{name}’s little day", { name: a.activeChild.name })
                  : a.page === "Supplies"
                    ? tr("Ready for the everyday.")
                    : a.page === "Settings"
                      ? tr("Make yourself at home.")
                      : tr("Make room for your routine.")}
              </h1>
              <p>
                {a.page === "Today"
                  ? tr(a.activeChild.caption)
                  : a.page === "Supplies"
                    ? tr(
                        "Family supplies, with one less thing to keep in your head.",
                      )
                    : a.page === "Settings"
                      ? tr("Small preferences for your everyday.")
                      : tr("Choose what matters. Build a record that fits.")}
              </p>
            </div>
            {a.page === "Today" ? (
              <Button
                className="primary"
                onClick={() => a.openRecord(a.types[0])}
              >
                {tr("＋ Add a record")}
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
                ＋{" "}
                {a.page === "Supplies"
                  ? tr("Add supply")
                  : tr("Create record type")}
              </Button>
            ) : null}
          </header>
          <SaveError />
          <SessionBanner />
          {children}
          <div className="notice" role="status">
            {a.notice}
            {a.undo && <button onClick={a.undo}>{tr("Undo")}</button>}
          </div>
          <footer className="app-footer">
            {tr("Saved on this device · No cloud sync")}
          </footer>
        </main>
      </div>
      <WorkspaceModal />
      <NursingMiniBar />
      <NursingTimer />
    </>
  );
}
