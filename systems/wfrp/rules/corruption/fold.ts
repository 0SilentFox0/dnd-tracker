import { moveOf, value } from "../characteristics/derive";
import type { CharacteristicKey, Characteristics } from "../characteristics/keys";
import { modifiersOf } from "./modifiers";

/** Bakes mutation modifiers into base/advances/move so battle participants carry effective values and no corruption state. */
export function foldCorruption(c: Characteristics): Characteristics {
  const { corruption, ...rest } = c;

  if (!corruption) return rest;

  const mods = modifiersOf(corruption);

  const base = { ...c.base };

  const advances = { ...c.advances };

  for (const key of Object.keys(mods.characteristics) as CharacteristicKey[]) {
    const target = Math.min(200, value(c, key));

    base[key] = Math.min(100, Math.max(1, target - c.advances[key]));
    advances[key] = target - base[key];
  }

  return { ...rest, base, advances, move: Math.min(12, moveOf(c)) };
}
