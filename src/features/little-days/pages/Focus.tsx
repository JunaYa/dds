import { Settings } from "./Settings";
import { Supplies } from "./Supplies";
import { Types } from "./Types";
import { Shell } from "../components/layout/Shell";
import { Icon } from "../components/common/Icon";
import { Log } from "../components/records/Log";
import { LogTools } from "../components/records/LogTools";
import { useApp } from "../hooks/useApp";

export default function Focus() {
  const a = useApp();
  return (
    <Shell>
      {a.page === "Today" ? (
        <div className="journal">
          <section className="quick-records" aria-label="Quick add a record">
            <div className="section-heading">
              <h2>Capture a little moment</h2>
              <span>Choose a record to get started</span>
            </div>
            <div className="focus-types">
              {a.types.map((type) => (
                <button key={type.id} onClick={() => a.openRecord(type)}>
                  <Icon name={type.icon} />
                  <span>{type.name}</span>
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
