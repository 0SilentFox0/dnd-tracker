import { textRef } from "@/lib/i18n/text-ref";
import type { DamageRow } from "@/types/battle";

export type DamageBreakdownRow = DamageRow;

const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase("uk") + s.slice(1);

const DICE = textRef("battleLog.damage.rows.dice");

const signed = (n: string) => (n.startsWith("-") || n.startsWith("+") ? n : `+${n}`);

type Rule = [RegExp, (m: RegExpMatchArray) => DamageBreakdownRow];

// legacy string formats (events stored before damageRows) and spell/power.ts
 
const RULES: Rule[] = [
  [/^─+$/, () => ({ label: "", tone: "rule" })],
  [/^Сума кубиків: (.+)$/, (m) => ({ label: DICE, value: m[1], tone: "step" })],
  [/^\+ сума кубиків \((\d+)\)$/, (m) => ({ label: DICE, value: m[1], tone: "step" })],
  [/^([+−-]) (\d+) \((.+)\) = (\d+)$/, (m) => ({ label: capitalize(m[3]), value: `${m[1] === "+" ? "+" : "−"}${m[2]} → ${m[4]}`, tone: "total" })],
  [/^\+ бонус (-?\d+) \((.+)\)$/, (m) => ({ label: m[2], value: signed(m[1]), tone: "step" })],
  [/^\+ (\d+) \((.+)\)$/, (m) => ({ label: capitalize(m[2]), value: `+${m[1]}`, tone: "step" })],
  [/^= (\d+) \((.+)\)$/, (m) => ({ label: capitalize(m[2]), value: m[1], tone: "total" })],
  [/^Flat (.+?): ([+-]?\d+) \((.+)\)$/, (m) => ({ label: m[3], source: capitalize(m[1]), value: signed(m[2]), tone: "step" })],
  [/^(.+?): ([+-]?[\d.]+%) \((.+)\)$/, (m) => ({ label: m[3], source: m[1], value: signed(m[2]), tone: "step" })],
  [/^Сума ([\d.]+) = (\d+) (?:шкоди|урону)$/, (m) => ({ label: textRef("battleLog.damage.rows.sum"), value: m[2], tone: "total" })],
  [/^× ([\d.]+) \((.+)\) = (\d+)(?: урону)?$/, (m) => ({ label: capitalize(m[2]), value: `×${m[1]} → ${m[3]}`, tone: "total" })],
  [/^\+ бонус (.+): (\d+)% від \d+ \(([+-]\d+)\)$/, (m) => ({ label: m[1], value: `+${m[2]}% (${m[3]})`, tone: "step" })],
  [/^\+ бонус (.+) \(([+-]\d+)\)$/, (m) => ({ label: m[1], value: m[2], tone: "step" })],
];

 

/** Legacy damage text («…; …») → table rows; an unknown format stays as text. */
export function parseDamageBreakdown(text: string): DamageBreakdownRow[] {
  return text
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => {
      for (const [re, row] of RULES) {
        const m = line.match(re);

        if (m) return row(m);
      }

      return { label: line, tone: "note" as const };
    });
}
