export type DiceGroup = { count: number; size: number };

export type DiceFormula = { groups: DiceGroup[]; flat: number };

const TERM = /^([+-]?)(\d*)d(\d+)$|^([+-]?)(\d+)$/;

export function parseDice(formula: string): DiceFormula | null {
  const compact = formula.replace(/\s+/g, "").toLowerCase();

  if (!compact) return null;

  const terms = compact.match(/[+-]?[^+-]+/g);

  if (!terms) return null;

  const result: DiceFormula = { groups: [], flat: 0 };

  for (const term of terms) {
    const m = TERM.exec(term);

    if (!m) return null;

    if (m[3] !== undefined) {
      if (m[1] === "-") return null;

      const count = m[2] === "" ? 1 : Number(m[2]);

      const size = Number(m[3]);

      if (count < 1 || size < 1) return null;

      result.groups.push({ count, size });
    } else {
      const value = Number(m[5]);

      result.flat += m[4] === "-" ? -value : value;
    }
  }

  return result;
}

export function diceAverage(formula: string): number {
  const parsed = parseDice(formula);

  if (!parsed) return 0;

  return parsed.groups.reduce((sum, g) => sum + (g.count * (g.size + 1)) / 2, parsed.flat);
}

export function diceMax(formula: string): number {
  const parsed = parseDice(formula);

  if (!parsed) return 0;

  return parsed.groups.reduce((sum, g) => sum + g.count * g.size, parsed.flat);
}

export function diceCount(formula: string): number {
  return parseDice(formula)?.groups.reduce((sum, g) => sum + g.count, 0) ?? 0;
}

function mergedGroups(formulas: string[]): DiceGroup[] {
  const bySize = new Map<number, number>();

  for (const formula of formulas) {
    for (const g of parseDice(formula)?.groups ?? []) bySize.set(g.size, (bySize.get(g.size) ?? 0) + g.count);
  }

  return [...bySize].sort(([a], [b]) => a - b).map(([size, count]) => ({ count, size }));
}

export function mergeDiceFormulas(...formulas: string[]): string {
  return mergedGroups(formulas)
    .map((g) => `${g.count}d${g.size}`)
    .join("+");
}

export function diceSlots(formula: string): number[] {
  return mergedGroups([formula]).flatMap((g) => Array.from({ length: g.count }, () => g.size));
}

/** Імпорт пише кубики вільним текстом («2d8 + MOD»), тому береться лише перша група. */
export function leadingDice(text: string): DiceGroup | null {
  const m = /^\s*(\d*)\s*d(\d+)/i.exec(text);

  if (!m) return null;

  const count = m[1] === "" ? 1 : Number(m[1]);

  const size = Number(m[2]);

  return count >= 1 && size >= 1 ? { count, size } : null;
}

export function rollDiceList(formula: string, rng: () => number = Math.random): number[] {
  return (parseDice(formula)?.groups ?? []).flatMap((g) =>
    Array.from({ length: g.count }, () => 1 + Math.floor(rng() * g.size)),
  );
}

export function rollDice(formula: string, rng: () => number = Math.random): number {
  const parsed = parseDice(formula);

  if (!parsed) return 0;

  return Math.max(0, rollDiceList(formula, rng).reduce((sum, roll) => sum + roll, parsed.flat));
}
