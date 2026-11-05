import type { FortuneKind } from "@/lib/utils/rules/systems/types";

type FortuneInput = { kind: FortuneKind; manualReroll?: number } | undefined;

/** `test(preset, first)` runs one test; a reroll receives the first result. An `sl` Fortune is the caller's job (it adds the bonus inside `test`). */
export function applyFortune<T extends { roll: number }>(
  test: (preset?: number, first?: T) => T,
  fortune: FortuneInput,
  isSuccess: (r: T) => boolean,
  firstPreset?: number,
): { result: T; fortune?: { kind: FortuneKind; firstRoll?: number } } {
  const first = test(firstPreset);

  if (fortune?.kind === "reroll" && !isSuccess(first)) return { result: test(fortune.manualReroll, first), fortune: { kind: "reroll", firstRoll: first.roll } };

  return fortune?.kind === "sl" ? { result: first, fortune: { kind: "sl" } } : { result: first };
}
