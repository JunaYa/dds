import { useI18n } from "../../i18n/LocaleProvider";
export function LanguagePicker() {
  const { locale, changeLocale, tr, error } = useI18n();
  return (
    <fieldset className="language-picker">
      <legend>{tr("Language")}</legend>
      <p>{tr("Choose the language used throughout the app.")}</p>
      <div className="language-options">
        {(
          [
            ["en", "English"],
            ["zh-CN", "简体中文"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} lang={value}>
            <input
              type="radio"
              name="language"
              value={value}
              checked={locale === value}
              onChange={() => changeLocale(value)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
      {error && (
        <p className="save-error" role="alert">
          {tr(error)}
        </p>
      )}
    </fieldset>
  );
}
