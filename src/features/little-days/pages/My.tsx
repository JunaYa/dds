import { Button } from "@vita/ui/button";
import { Icons } from "@vita/ui/icons";
import { useApp } from "../hooks/useApp";
import { useI18n } from "../i18n/useI18n";
import { Settings } from "./Settings";

export function My() {
  const { setPage } = useApp();
  const { tr } = useI18n();
  return (
    <div className="my-page">
      <section className="my-management" aria-label={tr("Manage your records")}>
        <Button variant="outline" onClick={() => setPage("Record types")}>
          <Icons.bookOpen aria-hidden="true" />{tr("Record types")}
        </Button>
        <Button variant="outline" onClick={() => setPage("Supplies")}>
          <Icons.box aria-hidden="true" />{tr("Supplies")}
        </Button>
      </section>
      <Settings />
    </div>
  );
}
