import { Settings } from "./Settings";
import { Supplies } from "./Supplies";
import { Types } from "./Types";
import { useState } from "react";
import { Shell } from "../components/layout/Shell";
import { Icon } from "../components/common/Icon";
import { Log } from "../components/records/Log";
import { LogTools } from "../components/records/LogTools";
import { useApp } from "../hooks/useApp";
import { RecordForm } from "../components/records/RecordForm";

export default function Focus() {
  const a = useApp(),
    [selected, setSelected] = useState("feed");
  const type = a.types.find((t) => t.id === selected) || a.types[0];
  return (
    <Shell>
      {a.page === "Today" ? (
        <div className="focus-columns">
          <section className="focus-recorder">
            <div className="section-heading">
              <h2>What’s happening?</h2>
              <span>One moment at a time</span>
            </div>
            <div className="focus-types">
              {a.types.map((t) => (
                <button
                  key={t.id}
                  aria-pressed={type.id === t.id}
                  onClick={() => setSelected(t.id)}
                >
                  <Icon name={t.icon} />
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
            <div className="focus-form">
              <div className="focus-form-title">
                <Icon name={type.icon} />
                <h2>{type.name}</h2>
              </div>
              <RecordForm
                key={`${a.child}-${type.id}`}
                type={type}
                child={a.child}
                inline
              />
            </div>
          </section>
          <section className="focus-history">
            <LogTools />
            <Log title="Records" compact />
          </section>
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
