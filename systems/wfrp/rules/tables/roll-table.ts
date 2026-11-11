import { rollDie } from "@/lib/utils/common/dice";
import type { Rng } from "@/lib/utils/common/rng";

export function rollTable<T extends { max: number }>(rows: readonly T[], rng: Rng, preset?: number): { index: number; row: T; roll: number } {
  const roll = preset ?? rollDie(100, rng);

  const found = rows.findIndex((row) => roll <= row.max);

  const index = found === -1 ? rows.length - 1 : found;

  return { index, row: rows[index], roll };
}
