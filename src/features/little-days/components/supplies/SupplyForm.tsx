import { useState } from "react";
import { Button } from "@vita/ui/button";
import { useApp } from "../../hooks/useApp";
import { type Supply } from "../../domain/model";

export function SupplyForm({ supply }: { supply?: Supply }) {
  const a = useApp(),
    [name, setName] = useState(""),
    [unit, setUnit] = useState("pieces"),
    [stock, setStock] = useState<number | string>(0),
    [low, setLow] = useState<number | string>(5),
    [amount, setAmount] = useState<number | string>(1);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (supply) {
          if (a.stockChange(supply.id, Number(amount))) a.setModal(null);
        } else
          a.addSupply({
            name: name.trim(),
            unit: unit.trim(),
            stock: Number(stock),
            low: Number(low),
          });
      }}
    >
      {supply ? (
        <>
          <h3 className="restock-name">{supply.name}</h3>
          <label className="form-field">
            How many {supply.unit} are you adding?
            <input
              required
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
        </>
      ) : (
        <>
          <label className="form-field">
            Supply name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Diapers, vitamins, anything you keep…"
            />
          </label>
          <label className="form-field">
            Stock unit
            <input
              required
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </label>
          <div className="record-fields">
            <label className="form-field">
              Quantity in stock
              <input
                required
                type="number"
                min="0"
                step="1"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </label>
            <label className="form-field">
              Refill threshold
              <input
                required
                type="number"
                min="0"
                step="1"
                value={low}
                onChange={(e) => setLow(e.target.value)}
              />
            </label>
          </div>
        </>
      )}
      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={() => a.setModal(null)}>
          Cancel
        </Button>
        <Button
          className="primary"
          type="submit"
          disabled={!supply && (!name.trim() || !unit.trim())}
        >
          {supply ? "Add stock" : "Save supply"}
        </Button>
      </div>
    </form>
  );
}
