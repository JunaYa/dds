import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@vita/ui/dialog";
import { useApp } from "../../hooks/useApp";
import { RecordForm } from "../records/RecordForm";
import { TypeBuilder } from "../record-types/TypeBuilder";
import { SupplyForm } from "../supplies/SupplyForm";
import { ChildForm } from "../children/ChildForm";
import { SaveError } from "../common/SaveError";

export function WorkspaceModal() {
  const a = useApp(),
    modal = a.modal;
  const titles = {
    record: "A little moment to remember",
    type: "Build your own record",
    supply: "Add to the cupboard",
    restock: "Restock a supply",
    child: "Add a child",
  };
  return (
    <Dialog open={!!modal} onOpenChange={(open) => !open && a.setModal(null)}>
      <DialogPopup
        className="care-dialog"
        showCloseButton={false}
        bottomStickOnMobile={false}
        initialFocus={
          matchMedia("(pointer: coarse)").matches ? false : undefined
        }
      >
        <DialogHeader>
          <div className="dialog-heading">
            <DialogTitle>{modal ? titles[modal.kind] : ""}</DialogTitle>
            <button aria-label="Close dialog" onClick={() => a.setModal(null)}>
              ×
            </button>
          </div>
          <DialogDescription>
            {modal?.kind === "type"
              ? "Combine reusable fields to fit your routine."
              : modal?.kind === "record"
                ? `Recording for ${a.children.find((c) => c.id === modal.child)?.name}.`
                : "Your preferences, kept simple."}
          </DialogDescription>
        </DialogHeader>
        <SaveError />
        {modal?.kind === "record" && (
          <RecordForm
            key={modal.record?.id || modal.type.id}
            type={modal.type}
            record={modal.record}
            child={modal.child}
          />
        )}
        {modal?.kind === "type" && <TypeBuilder />}
        {(modal?.kind === "supply" || modal?.kind === "restock") && (
          <SupplyForm
            supply={modal.kind === "restock" ? modal.supply : undefined}
          />
        )}
        {modal?.kind === "child" && <ChildForm />}
      </DialogPopup>
    </Dialog>
  );
}
