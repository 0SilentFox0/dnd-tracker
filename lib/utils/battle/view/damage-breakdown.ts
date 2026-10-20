export interface DamageBreakdownRow {
  label: string;
  /** звідки бонус: «Бонус зі скілів», «Расовий бонус»… */
  source?: string;
  value?: string;
  tone: "step" | "total" | "rule" | "note";
}

const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase("uk") + s.slice(1);

const signed = (n: string) => (n.startsWith("-") || n.startsWith("+") ? n : `+${n}`);

type Rule = [RegExp, (m: RegExpMatchArray) => DamageBreakdownRow];

// формати рядків з damage/impl.ts, damage/breakdown.ts, attack/process/compute.ts, spell/power.ts
const RULES: Rule[] = [
  [/^─+$/, () => ({ label: "", tone: "rule" })],
  [/^Сума кубиків: (.+)$/, (m) => ({ label: "Кубики", value: m[1], tone: "step" })],
  [/^\+ сума кубиків \((\d+)\)$/, (m) => ({ label: "Кубики", value: m[1], tone: "step" })],
  [/^([+−-]) (\d+) \((.+)\) = (\d+)$/, (m) => ({ label: capitalize(m[3]), value: `${m[1] === "+" ? "+" : "−"}${m[2]} → ${m[4]}`, tone: "total" })],
  [/^\+ бонус (-?\d+) \((.+)\)$/, (m) => ({ label: m[2], value: signed(m[1]), tone: "step" })],
  [/^\+ (\d+) \((.+)\)$/, (m) => ({ label: capitalize(m[2]), value: `+${m[1]}`, tone: "step" })],
  [/^= (\d+) \((.+)\)$/, (m) => ({ label: capitalize(m[2]), value: m[1], tone: "total" })],
  [/^Flat (.+?): ([+-]?\d+) \((.+)\)$/, (m) => ({ label: m[3], source: capitalize(m[1]), value: signed(m[2]), tone: "step" })],
  [/^(.+?): ([+-]?[\d.]+%) \((.+)\)$/, (m) => ({ label: m[3], source: m[1], value: signed(m[2]), tone: "step" })],
  [/^Сума ([\d.]+) = (\d+) (?:шкоди|урону)$/, (m) => ({ label: "Сума", value: m[2], tone: "total" })],
  [/^× ([\d.]+) \((.+)\) = (\d+)(?: урону)?$/, (m) => ({ label: capitalize(m[2]), value: `×${m[1]} → ${m[3]}`, tone: "total" })],
  [/^\+ бонус (.+): (\d+)% від \d+ \(([+-]\d+)\)$/, (m) => ({ label: m[1], value: `+${m[2]}% (${m[3]})`, tone: "step" })],
  [/^\+ бонус (.+) \(([+-]\d+)\)$/, (m) => ({ label: m[1], value: m[2], tone: "step" })],
];

/** Текстовий розклад шкоди («…; …») → рядки таблиці; невідомий формат лишається текстом */
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
