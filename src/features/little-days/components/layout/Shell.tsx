import { isProfileDetail } from "../../state/page-routing";
import { useI18n } from "../../i18n/useI18n";
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
import { IosNavigation } from "./IosNavigation";
import { isIosApp } from "./ios-platform";

export function Shell({ children }: { children: ReactNode }) {
  const { tr, locale } = useI18n();
  const a = useApp();
  const ios = isIosApp();
  if (!a.activeChild) return null;
  return (
    <div className={ios ? "ios-workspace" : undefined}>
      <div className="app-frame">
        {!ios && <aside className="sidebar">
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
        </aside>}
        {ios && (
          <div className="ios-profile">
            <div className="ios-profile-content"><ChildPicker /></div>
          </div>
        )}
        <main>
          {!ios && <MobileNavigation />}
          {(isProfileDetail(a.page) || a.page === "Settings") && (
            <Button variant="ghost" onClick={() => a.setPage("My")}>{tr("← Profile")}</Button>
          )}
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
              <p>
                {a.page === "Today"
                  ? tr(a.activeChild.caption)
                  : a.page === "Analysis"
                    ? tr("A look at your baby's recent days.")
                    : a.page === "My"
                      ? tr("Your family, records, and preferences.")
                  : a.page === "Supplies"
                    ? tr(
                        "Family supplies, with one less thing to keep in your head.",
                      )
                    : ["Settings", "Appearance", "Interaction", "Backup", "Storage", "Cloud"].includes(a.page)
                      ? tr("Small preferences for your everyday.")
                      : tr("Choose what matters. Build a record that fits.")}
              </p>
            </div>
            {a.page === "Today" ? (
              <Button
                className="primary home-add-record"
                onClick={() => a.openRecord(a.types[0])}
              >
                {tr("＋ Add a record")}
              </Button>
            ) : a.page === "Supplies" || a.page === "Record types" ? (
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
            {a.undo && (
              <Button unstyled onClick={a.undo}>
                {tr("Undo")}
              </Button>
            )}
          </div>
          <footer className="app-footer">
            {tr("Saved on this device")}
          </footer>
        </main>
      </div>
      <WorkspaceModal />
      <NursingMiniBar />
      <NursingTimer />
      {ios && <IosNavigation />}
    </div>
  );
}
