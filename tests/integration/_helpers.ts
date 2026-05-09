/**
 * Спільні хелпери для інтеграційних тестів.
 */

export function envFlag(...names: string[]): boolean {
  return names.every((n) => Boolean(process.env[n]?.trim()));
}

export function logSkipReason(suite: string, missing: string[]): void {
  console.warn(
    `[integration:${suite}] skipped — missing env vars: ${missing.join(", ")}`,
  );
}

export function findMissing(...names: string[]): string[] {
  return names.filter((n) => !process.env[n]?.trim());
}

/** Унікальний test prefix щоб уникнути колізій між паралельними прогонами. */
export const TEST_RUN_ID = `int-${Date.now()}-${Math.random()
  .toString(36)
  .slice(2, 8)}`;
