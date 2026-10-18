import { useI18n } from "../i18n/useI18n";
import { Settings } from "./Settings";
import { Analysis } from "./Analysis";
import { My } from "./My";
import { Supplies } from "./Supplies";
import { Types } from "./Types";
import { Shell } from "../components/layout/Shell";
import { RecordTypeChoices } from "../components/records/RecordTypeChoices";
import { Log } from "../components/records/Log";
import { LogTools } from "../components/records/LogTools";
import { useApp } from "../hooks/useApp";

export default function Focus() {
  const { tr } = useI18n();
  const a = useApp();
  return (
    <Shell>
      {a.page === "Today" ? (
        <div className="journal">
          <section
            className="quick-records"
            aria-label={tr("Quick add a record")}
          >
            <div className="section-heading">
              <h2>{tr("Capture a little moment")}</h2>
              <span>{tr("Choose a record to get started")}</span>
            </div>
            <RecordTypeChoices />
          </section>
          <LogTools />
          <Log title="Records" />
        </div>
      ) : a.page === "Analysis" ? (
        <Analysis />
      ) : a.page === "My" ? (
        <My />
      ) : a.page === "Supplies" ? (
        <Supplies />
      ) : ["Appearance", "Interaction", "Backup", "Storage"].includes(a.page) ? (
        <Settings section={a.page as "Appearance" | "Interaction" | "Backup" | "Storage"} />
      ) : a.page === "Settings" ? (
        <Settings />
      ) : (
        <Types />
      )}
    </Shell>
  );
}
