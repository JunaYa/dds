import { MiniAudioPlayer } from "../../listening/Listening";
import { isProfileDetail } from "../../state/page-routing";
import { useI18n } from "../../i18n/useI18n";
import { type ReactNode } from "react";
import { Toast } from "@vita/ui/toast";
import { Button } from "@vita/ui/button";
import { PageElasticity } from "@vita/ui/page-elasticity";
import { useApp } from "../../hooks/useApp";
import { PageNavigation } from "./PageNavigation";
import { MobileNavigation } from "./MobileNavigation";
import { Icon } from "../common/Icon";
import { NursingTimer } from "../nursing/NursingTimer";
import { NursingMiniBar } from "../nursing/NursingMiniBar";
import { ChildPicker } from "../children/ChildPicker";
import { SaveError } from "../common/SaveError";
import { SessionBanner } from "../timers/SessionBanner";
import { ProfileDetailModal } from "../dialogs/ProfileDetailModal";
import { IosNavigation } from "./IosNavigation";
import { isIosApp } from "./ios-platform";

export function Shell({ children }: { children: ReactNode }) {
  const { tr, locale } = useI18n();
  const a = useApp();
  const ios = isIosApp();
  const page = isProfileDetail(a.page) ? "My" : a.page;
  if (!a.activeChild) return null;
  return (
    <div className={ios ? "ios-workspace" : undefined}>
      <PageElasticity enabled={!a.modal && !a.nursingOpen && !isProfileDetail(a.page)} resetKey={`${page}:${a.child}`}>
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
          {(a.page === "Settings") && (
            <Button variant="ghost" onClick={() => a.setPage("My")}>{tr("← Profile")}</Button>
          )}
          <header className="page-heading">
            <div>
              <div className="eyebrow">
                {new Date(`${a.day}T12:00`).toLocaleDateString(locale, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <p>
                {page === "Today"
                  ? tr(a.activeChild.caption)
                  : page === "Analysis"
                    ? tr("A look at your baby's recent days.")
                    : page === "My"
                      ? tr("Your family, records, and preferences.")
                  : page === "Supplies"
                    ? tr(
                        "Family supplies, with one less thing to keep in your head.",
                      )
                    : ["Settings", "Appearance", "Interaction", "Backup", "Storage", "Cloud"].includes(page)
                      ? tr("Small preferences for your everyday.")
                      : tr("Choose what matters. Build a record that fits.")}
              </p>
            </div>
            {page === "Today" ? (
              <Button
                className="primary home-add-record"
                onClick={() => a.openRecord(a.types[0])}
              >
                {tr("＋ Add a record")}
              </Button>
            ) : page === "Supplies" || page === "Record types" ? (
              <Button
                className="primary"
                onClick={() =>
                  a.setModal({
                    kind: page === "Supplies" ? "supply" : "type",
                  })
                }
              >
                ＋{" "}
                {page === "Supplies"
                  ? tr("Add supply")
                  : tr("Create record type")}
              </Button>
            ) : null}
          </header>
          <SaveError />
          <SessionBanner />
          <MiniAudioPlayer />
          {children}
        </main>
      </div>
      </PageElasticity>
      {a.notice && (
        <Toast key={a.noticeId} onDismiss={a.dismissNotice} duration={a.undo ? 8000 : 5000}>
          <span>{a.notice}</span>
          {a.undo && <Button variant="ghost" onClick={a.undo}>{tr("Undo")}</Button>}
        </Toast>
      )}
      <ProfileDetailModal />
      <NursingMiniBar />
      <NursingTimer />
      {ios && <IosNavigation />}
    </div>
  );
}
