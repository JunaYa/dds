import { useI18n } from "../../i18n/LocaleProvider";
import { useApp } from "../../hooks/useApp";

export function SaveError() {
  const { tr } = useI18n();
  const { error } = useApp();
  return error ? (
    <p className="save-error" role="alert">
      {tr(error)}
    </p>
  ) : null;
}
