import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { Switch } from "@vita/ui/switch";
import { useI18n } from "../i18n/useI18n";
import { feedback, handleInteraction, hapticsEnabled, setHapticsEnabled, subscribeHaptics, supportsHaptics } from "./feedback";

export function HapticFeedback() {
  useEffect(() => {
    document.addEventListener("click", handleInteraction, true);
    return () => document.removeEventListener("click", handleInteraction, true);
  }, []);
  return null;
}
export function HapticSettings() {
  const { tr } = useI18n();
  const id = useId();
  const enabled = useSyncExternalStore(subscribeHaptics, hapticsEnabled);
  const [error, setError] = useState(false);
  if (!supportsHaptics()) return null;
  return <section className="settings-section" data-haptics="off">
    <div className="haptics-setting">
      <label htmlFor={id}>{tr("Haptic feedback")}</label>
      <Switch id={id} checked={enabled} aria-describedby={`${id}-help`} onCheckedChange={value => {
        setError(!setHapticsEnabled(value));
        if (value) feedback();
      }} />
    </div>
    <p id={`${id}-help`}>{tr("Feel a gentle tap when using controls. Enabled by default; availability depends on your device and system settings.")}</p>
    {error && <p role="alert">{tr("Applied for this session, but could not save this preference.")}</p>}
  </section>;
}
