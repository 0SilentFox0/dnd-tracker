import { defineSlot } from "@/lib/utils/rules/systems/slot";
import type { BattleParticipant } from "@/types/battle";

export type FortuneKind = "reroll" | "sl";

export interface FortuneInput {
  kind: FortuneKind;
  manualReroll?: number;
}

export const FORTUNE_INPUT = defineSlot<FortuneInput>("wfrp", (raw) => {
  if (typeof raw !== "object" || raw === null) return undefined;

  const { kind, manualReroll } = raw as Record<string, unknown>;

  if (kind !== "reroll" && kind !== "sl") return undefined;

  return { kind, ...(typeof manualReroll === "number" && { manualReroll }) };
});

export const spentFortune = (p: BattleParticipant): { fortune: number } => ({ fortune: Math.max(0, (p.battleData.fortune ?? 0) - 1) });

/** `test(preset, first)` runs one test; a reroll receives the first result. An `sl` Fortune is the caller's job (it adds the bonus inside `test`). */
export function applyFortune<T extends { roll: number }>(
  test: (preset?: number, first?: T) => T,
  fortune: FortuneInput | undefined,
  isSuccess: (r: T) => boolean,
  firstPreset?: number,
): { result: T; fortune?: { kind: FortuneKind; firstRoll?: number } } {
  const first = test(firstPreset);

  if (fortune?.kind === "reroll" && !isSuccess(first)) return { result: test(fortune.manualReroll, first), fortune: { kind: "reroll", firstRoll: first.roll } };

  return fortune?.kind === "sl" ? { result: first, fortune: { kind: "sl" } } : { result: first };
}
