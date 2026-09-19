import { useApp } from "../../hooks/useApp";

export function SaveError() {
  const { error } = useApp();
  return error ? (
    <p className="save-error" role="alert">
      {error}
    </p>
  ) : null;
}
