export type DiceFormula = {
  groups: Array<{ count: number; size: number }>;
  flat: number;
};

type DiceValidation =
  | { ok: true }
  | { ok: false; reason: "invalid_formula" | "count_mismatch" | "out_of_range" };

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

export function validateDiceRolls(
  formula: string,
  rolls: number[],
  opts: { critical?: boolean } = {},
): DiceValidation {
  const parsed = parseDice(formula);

  if (!parsed) return { ok: false, reason: "invalid_formula" };

  const multiplier = opts.critical ? 2 : 1;

  const sizes = parsed.groups.flatMap((g) =>
    Array.from({ length: g.count * multiplier }, () => g.size),
  );

  if (sizes.length !== rolls.length) return { ok: false, reason: "count_mismatch" };

  const inRange = rolls.every(
    (roll, i) => Number.isInteger(roll) && roll >= 1 && roll <= sizes[i],
  );

  return inRange ? { ok: true } : { ok: false, reason: "out_of_range" };
}

export function maxRoll(formula: string): number {
  const parsed = parseDice(formula);

  if (!parsed) return 0;

  return parsed.groups.reduce((sum, g) => sum + g.count * g.size, parsed.flat);
}

export function averageRoll(formula: string): number {
  const parsed = parseDice(formula);

  if (!parsed) return 0;

  return parsed.groups.reduce(
    (sum, g) => sum + (g.count * (g.size + 1)) / 2,
    parsed.flat,
  );
}
