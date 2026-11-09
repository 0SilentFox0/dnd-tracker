import type { CharacteristicKey } from "../characteristics/constants";
import type { CorruptionState } from "./types";

export type CorruptionModifiers = { characteristics: Partial<Record<CharacteristicKey, number>>; move: number; maxWounds: number };

export const EMPTY_MODIFIERS: CorruptionModifiers = { characteristics: {}, move: 0, maxWounds: 0 };

export function modifiersOf(state?: CorruptionState): CorruptionModifiers {
  if (!state?.mutations.length) return EMPTY_MODIFIERS;

  const characteristics: Partial<Record<CharacteristicKey, number>> = {};

  let move = 0;

  let maxWounds = 0;

  for (const mutation of state.mutations) {
    for (const effect of mutation.effects) {
      if (effect.type === "characteristic") characteristics[effect.key] = (characteristics[effect.key] ?? 0) + effect.amount;
      else if (effect.type === "move") move += effect.amount;
      else maxWounds += effect.amount;
    }
  }

  for (const key of Object.keys(characteristics) as CharacteristicKey[]) if (characteristics[key] === 0) delete characteristics[key];

  return { characteristics, move, maxWounds };
}
