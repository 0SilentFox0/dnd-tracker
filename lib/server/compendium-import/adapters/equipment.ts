/* eslint-disable no-restricted-syntax -- derived content written to the DB stays Ukrainian (spec part5, decision 5) */
import { stableJson } from "../identity";
import { array, num, object, str, titled } from "./shared";

const COIN = [[100, "зм"], [10, "см"], [1, "мм"]] as const;

const money = (cp: number) => {
  const [unit, name] = COIN.find(([u]) => cp % u === 0) ?? COIN[2];

  return `${cp / unit} ${name}`;
};

function equipmentItem(v: unknown): string {
  if (typeof v === "string") return titled(v);

  const row = object(v);

  const qty = num(row.quantity);

  const suffix = qty && qty > 1 ? ` ×${qty}` : "";

  if (num(row.value) !== undefined) return money(row.value as number);

  const name = str(row.displayName) || str(row.special) || (typeof row.item === "string" ? titled(row.item) : "") || (typeof row.equipmentType === "string" ? `будь-яка: ${titled(row.equipmentType)}` : "");

  return name ? `${name}${suffix}` : stableJson(v);
}

/** Starting equipment sets: "_" is always given, other keys (a, b…) are alternatives. */
export function equipmentText(raw: unknown): string {
  const lines = array(raw).map((set) => {
    const entries = Object.entries(object(set));

    const fixed = entries.filter(([k]) => k === "_").flatMap(([, v]) => array(v).map(equipmentItem));

    const options = entries.filter(([k]) => k !== "_").map(([k, v]) => `${k}) ${array(v).map(equipmentItem).join(", ")}`);

    return [fixed.join(", "), options.length > 0 ? `на вибір: ${options.join("; ")}` : ""].filter(Boolean).join("; ");
  });

  return lines.filter(Boolean).join("\n");
}
