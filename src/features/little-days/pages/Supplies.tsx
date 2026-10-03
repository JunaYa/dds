import { useI18n } from "../i18n/LocaleProvider";
import { Button } from "@vita/ui/button";
import { useApp } from "../hooks/useApp";
import { Icon } from "../components/common/Icon";

export function Supplies() {
  const { tr } = useI18n();
  const a = useApp();
  return (
    <>
      <p className="section-intro">
        {tr(
          "Stock is shared by the family. Recording care does not deduct supplies automatically.",
        )}
      </p>
      {!a.supplies.length && (
        <div className="empty">
          <Icon name="box" size={32} />
          <h3>{tr("Make room for the essentials.")}</h3>
          <p>
            {tr(
              "Add diapers, wipes, tissues, vitamins, or any supply you keep.",
            )}
          </p>
          <Button onClick={() => a.setModal({ kind: "supply" })}>
            {tr("Add supply")}
          </Button>
        </div>
      )}
      <div className="supply-grid">
        {a.supplies.map((item) => (
          <article className="supply-card" key={item.id}>
            <div className="section-heading">
              <Icon name="box" />
              {item.stock <= item.low && (
                <span className="low">{tr("Refill soon")}</span>
              )}
            </div>
            <h2>{item.name}</h2>
            <p className="stock-number">
              {item.stock}
              <span>{tr("{unit} left", { unit: item.unit })}</span>
            </p>
            <p className="muted">
              {tr("Your refill threshold: {count} {unit}", {
                count: item.low,
                unit: item.unit,
              })}
            </p>
            <div className="stock-controls">
              <Button
                variant="outline"
                disabled={item.stock === 0}
                onClick={() => a.stockChange(item.id, -1)}
              >
                {tr("Use 1")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => a.setModal({ kind: "restock", supply: item })}
              >
                {tr("Restock")}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
