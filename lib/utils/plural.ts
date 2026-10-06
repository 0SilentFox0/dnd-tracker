export function pluralUk(n: number, [one, few, many]: [string, string, string]): string {
  const a = Math.abs(n) % 100;

  const b = a % 10;

  if (a > 10 && a < 20) return many;

  if (b === 1) return one;

  if (b >= 2 && b <= 4) return few;

  return many;
}
