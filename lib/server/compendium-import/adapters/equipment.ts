import { stableJson } from "../identity";
import { array, num, object, str, titled } from "./shared";

import type { Translator } from "@/lib/i18n/translator";

const COIN = [[100, "gp"], [10, "sp"], [1, "cp"]] as const;

const money = (cp: number, t: Translator) => {
  const [unit, name] = COIN.find(([u]) => cp % u === 0) ?? COIN[2];

  return `${cp / unit} ${t(`derived.coin.${name}`)}`;
};

function equipmentItem(v: unknown, t: Translator): string {
  if (typeof v === "string") return titled(v);

  const row = object(v);

  const qty = num(row.quantity);

  const suffix = qty && qty > 1 ? ` ×${qty}` : "";

  if (num(row.value) !== undefined) return money(row.value as number, t);

  const name = str(row.displayName) || str(row.special) || (typeof row.item === "string" ? titled(row.item) : "") || (typeof row.equipmentType === "string" ? t("derived.equipment.anyOf", { name: titled(row.equipmentType) }) : "");

  return name ? `${name}${suffix}` : stableJson(v);
}

/** Starting equipment sets: "_" is always given, other keys (a, b…) are alternatives. */
export function equipmentText(raw: unknown, t: Translator): string {
  const lines = array(raw).map((set) => {
    const entries = Object.entries(object(set));

    const fixed = entries.filter(([k]) => k === "_").flatMap(([, v]) => array(v).map((item) => equipmentItem(item, t)));

    const options = entries.filter(([k]) => k !== "_").map(([k, v]) => `${k}) ${array(v).map((item) => equipmentItem(item, t)).join(", ")}`);

    return [fixed.join(", "), options.length > 0 ? t("derived.equipment.options", { list: options.join("; ") }) : ""].filter(Boolean).join("; ");
  });

  return lines.filter(Boolean).join("\n");
}
