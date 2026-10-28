import { rollDie } from "@/lib/utils/common/dice";

export type D20Mode = "advantage" | "disadvantage" | "normal";

export function rollD20WithMode(mode: D20Mode, rng: () => number, presetRoll?: number): { roll: number; rolls: number[] } {
  const first = presetRoll ?? rollDie(20, rng);

  const rolls = mode === "normal" ? [first] : [first, rollDie(20, rng)];

  const roll = mode === "advantage" ? Math.max(...rolls) : mode === "disadvantage" ? Math.min(...rolls) : first;

  return { roll, rolls };
}
