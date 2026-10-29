import { type AbilityKey } from "@/lib/constants/abilities";
import { proficiencyForChallenge } from "@/lib/constants/challenge";
import { getAbilityModifier } from "@/lib/utils/common/calculations";
import { clamp } from "@/lib/utils/common/clamp";

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

const MULTI_COUNT = /\b(one|two|three|four|five|six|seven|eight|nine|ten)\s(?:[^.,]*?\s)?attacks?\b/gi;

const MULTI_ALT = /,?\s+or (?:it|he|she|the \w+) makes\b/i;


export function multiattackCount(desc: string): number {
  const first = (desc.split(/\.\s/)[0] ?? "").split(MULTI_ALT)[0];

  const total = [...first.matchAll(MULTI_COUNT)].reduce((sum, m) => sum + (NUMBER_WORDS[m[1].toLowerCase()] ?? 0), 0);

  return clamp(total, 1, 10);
}

type Scores = Partial<Record<AbilityKey, number>>;

/** The engine adds this ability modifier to the attack roll and to damage (5e units): finesse takes the better of STR/DEX, ranged DEX, melee STR. */
export function engineAttackMod(scores: Scores, type: "melee" | "ranged", finesse: boolean): number {
  const str = getAbilityModifier(clamp(scores.strength ?? 10, 1, 30));

  const dex = getAbilityModifier(clamp(scores.dexterity ?? 10, 1, 30));

  if (finesse) return Math.max(str, dex);

  return type === "ranged" ? dex : str;
}

/** Statblock to-hit minus what the engine adds on its own (ability modifier + CR proficiency). */
export const residualAttackBonus = (toHit: number, mod: number, cr: number): number => toHit - mod - proficiencyForChallenge(cr);

export function withFlat(dice: string, flat: number): string {
  return flat === 0 ? dice : `${dice}${flat > 0 ? "+" : ""}${flat}`;
}
