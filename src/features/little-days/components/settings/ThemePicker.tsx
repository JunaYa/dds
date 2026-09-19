import { useId } from "react";
import { useTheme } from "../../hooks/useTheme";
import type { ThemePreference } from "../../storage/preferences";

const options: { value: ThemePreference; label: string; description: string }[] = [
  { value: "system", label: "System", description: "Follow your device" },
  { value: "light", label: "Light", description: "A brighter everyday" },
  { value: "dark", label: "Dark", description: "Gentle in low light" },
];

export function ThemePicker() {
  const { preference, resolved, error, changeTheme } = useTheme();
  const id = useId();
  return (
    <fieldset className="theme-picker" aria-describedby={`${id}-hint`}>
      <legend>Appearance</legend>
      <p id={`${id}-hint`}>Choose a comfortable light for your little days.</p>
      <div className="theme-options">
        {options.map(({ value, label, description }) => (
          <label className="theme-option" key={value}>
            <input type="radio" name={id} value={value} checked={preference === value} onChange={() => changeTheme(value)} />
            <span className={`theme-preview theme-preview-${value}`} aria-hidden="true">
              <span className="theme-preview-sidebar" />
              <span className="theme-preview-content"><i /><i /><i /></span>
            </span>
            <span className="theme-option-title">{label}<span className="theme-check" aria-hidden="true">✓</span></span>
            <span className="theme-option-description">{description}</span>
          </label>
        ))}
      </div>
      <p className="theme-status" role="status">
        {preference === "system" ? `Following your device · ${resolved === "dark" ? "Dark" : "Light"}` : `${preference === "dark" ? "Dark" : "Light"} appearance`}
      </p>
      {error && <p className="save-error" role="alert">{error}</p>}
    </fieldset>
  );
}
