export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function parseDiceExpr(s: string | null | undefined): { count: number; sides: number } | null {
  const m = /^(\d+)d(\d+)/.exec((s ?? "").trim());

  return m ? { count: Number(m[1]), sides: Number(m[2]) } : null;
}

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

export function numberWord(s: string): number | null {
  const lower = s.toLowerCase();

  if (lower in NUMBER_WORDS) return NUMBER_WORDS[lower];

  return /^\d+$/.test(s) ? Number(s) : null;
}
