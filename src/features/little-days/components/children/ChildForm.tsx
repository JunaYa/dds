import { DateTimePicker } from "@vita/ui/date-time-picker";
import { Input } from "@vita/ui/input";
import { useI18n } from "../../i18n/useI18n";
import { useId, useState } from "react";
import { Button } from "@vita/ui/button";
import { useApp } from "../../hooks/useApp";
import { today } from "../../domain/model";

export function ChildForm() {
  const { tr, locale } = useI18n();
  const dateInputId = useId();
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
        <Input
          nativeInput
          required
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <div className="form-field">
        <label htmlFor={dateInputId}>{tr("Birthday")}</label>
        <DateTimePicker
          id={dateInputId}
          locale={locale}
          required
          mode="date"
          max={today()}
          value={birthday}
          onValueChange={setBirthday}
        />
      </div>
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
