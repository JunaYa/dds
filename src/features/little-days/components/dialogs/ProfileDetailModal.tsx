import { useRef, useState } from "react";
import { Button } from "@vita/ui/button";
import { Icons } from "@vita/ui/icons";
import { Dialog, DialogPopup, DialogHeader, DialogTitle, DialogDescription } from "@vita/ui/dialog";
import { useApp } from "../../hooks/useApp";
import { useI18n } from "../../i18n/useI18n";
import { isProfileDetail } from "../../state/page-routing";
import { Settings } from "../../pages/Settings";
import { Types } from "../../pages/Types";
import { Supplies } from "../../pages/Supplies";
import { CloudSettings } from "../../sync/CloudSettings";
import { SaveError } from "../common/SaveError";
import { WorkspaceModal } from "./WorkspaceModal";

export function ProfileDetailModal() {
  const a = useApp();
  const { tr } = useI18n();
  const detail = isProfileDetail(a.page) ? a.page : null;
  const [lastDetail, setLastDetail] = useState(detail);
  const returnFocus = useRef<HTMLElement | null>(null);
  if (detail && detail !== lastDetail) {
    setLastDetail(detail);
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }
  const page = detail ?? lastDetail;
  const title = page === "Appearance" ? "Language and appearance"
    : page === "Backup" ? "Backup and restore"
    : page === "Storage" ? "On this device"
    : page === "Cloud" ? "Cloud sync" : page ?? "Profile";
  return (
    <Dialog open={!!detail} onOpenChange={open => !open && a.setPage("My")}
      onOpenChangeComplete={open => { if (!open) setLastDetail(null); }}>
      <DialogPopup className="care-dialog profile-detail-dialog" showCloseButton={false}
        bottomStickOnMobile={false}
        initialFocus={matchMedia("(pointer: coarse)").matches ? false : undefined}
        finalFocus={returnFocus}>
        <DialogHeader>
          <div className="dialog-heading">
            <DialogTitle>{tr(title)}</DialogTitle>
            <Button variant="ghost" size="icon" aria-label={tr("Close dialog")} onClick={() => a.setPage("My")}>
              <Icons.close aria-hidden="true" />
            </Button>
          </div>
          <DialogDescription>{tr("Your preferences, kept simple.")}</DialogDescription>
        </DialogHeader>
        <SaveError />
        {(page === "Supplies" || page === "Record types") && <Button className="primary" onClick={() => a.setModal({ kind: page === "Supplies" ? "supply" : "type" })}>
          {tr(page === "Supplies" ? "Add supply" : "Create record type")}
        </Button>}
        {page === "Cloud" ? <CloudSettings />
          : page === "Supplies" ? <Supplies />
          : page === "Record types" ? <Types />
          : page && ["Appearance", "Interaction", "Backup", "Storage"].includes(page)
            ? <Settings section={page as "Appearance" | "Interaction" | "Backup" | "Storage"} /> : null}
      </DialogPopup>
      <WorkspaceModal />
    </Dialog>
  );
}
