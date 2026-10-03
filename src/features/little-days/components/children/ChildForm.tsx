import { useI18n } from "../../i18n/LocaleProvider";
import { useState } from "react";
import { Button } from "@vita/ui/button";
import { useApp } from "../../hooks/useApp";
import { today } from "../../domain/model";

export function ChildForm() {
  const { tr } = useI18n();
  const a = useApp(),
    [name, setName] = useState(""),
    [birthday, setBirthday] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        a.saveChild({ name: name.trim(), birthday });
      }}
    >
      <label className="form-field">
        {tr("Child’s name")}
        <input
          required
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="form-field">
        {tr("Birthday")}
        <input
          required
          type="date"
          max={today()}
          value={birthday}
          onChange={(e) => setBirthday(e.target.value)}
        />
      </label>
      <div className="form-actions">
        <Button
          type="submit"
          className="primary"
          disabled={!name.trim() || !birthday}
        >
          {tr("Add child")}
        </Button>
      </div>
    </form>
  );
}
