import { Icons, type AppIcon } from "@vita/ui/icons";
import type { RecordType } from "../../domain/model";
import { Icon } from "../common/Icon";

const typeIcons = new Map<string, AppIcon>([
  ["feed", Icons.careFeeding],
  ["diaper", Icons.careDiaper],
  ["sleep", Icons.careSleep],
  ["bath", Icons.careBath],
  ["vaccine", Icons.careVaccination],
  ["growth", Icons.careGrowth],
  ["vitamin", Icons.careVitamins],
  ["cali-pump", Icons.carePumping],
  ["cali-temperature", Icons.careTemperature],
  ["cali-sun", Icons.careSun],
]);

export function RecordTypeIcon({ type, size = 22 }: {
  type: Pick<RecordType, "id" | "icon">;
  size?: number;
}) {
  const Glyph = typeIcons.get(type.id) ?? (type.icon === "spark" ? Icons.careRoutine : undefined);
  return Glyph
    ? <Glyph size={size} strokeWidth={1.7} aria-hidden="true" />
    : <Icon name={type.icon} size={size} />;
}
