import { typeName } from "../i18n/record-labels";
import { useI18n } from "../i18n/useI18n";
import { Settings } from "./Settings";
import { Supplies } from "./Supplies";
import { Types } from "./Types";
import { Shell } from "../components/layout/Shell";
import { Icon } from "../components/common/Icon";
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
            <div className="focus-types">
              {a.types.map((type) => (
                <button key={type.id} onClick={() => a.openRecord(type)}>
                  <Icon name={type.icon} />
                  <span>{typeName(type, tr)}</span>
                </button>
              ))}
            </div>
          </section>
          <LogTools />
          <Log title="Records" />
        </div>
      ) : a.page === "Supplies" ? (
        <Supplies />
      ) : a.page === "Settings" ? (
        <Settings />
      ) : (
        <Types />
      )}
    </Shell>
  );
}
