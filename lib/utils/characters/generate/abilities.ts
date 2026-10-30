import { shuffle } from "./rng";

import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import { type HeroArchetypeKey } from "@/lib/constants/hero-archetypes";
import type { GameClassData } from "@/types/classes";

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;

export const POINT_BUY_BUDGET = 27;

export const POINT_BUY_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

export type AbilityMethod = "standard" | "pointBuy";

export type AbilityScores = Record<AbilityKey, number>;

export const ARCHETYPE_PRIMARY: Record<HeroArchetypeKey, AbilityKey[]> = {
  warrior: ["strength", "constitution"],
  paladin: ["strength", "charisma", "constitution"],
  ranger: ["dexterity", "wisdom"],
  rogue: ["dexterity", "intelligence"],
  mage: ["intelligence", "wisdom"],
};

export const pointBuySpent = (scores: AbilityScores) => ABILITY_KEYS.reduce((sum, k) => sum + (POINT_BUY_COST[scores[k]] ?? Infinity), 0);

export function validateAbilityScores(scores: AbilityScores, method: AbilityMethod): boolean {
  const values = ABILITY_KEYS.map((k) => scores[k]);

  if (values.some((v) => !Number.isInteger(v))) return false;

  if (method === "standard") return [...values].sort((a, b) => b - a).every((v, i) => v === STANDARD_ARRAY[i]);

  return values.every((v) => v >= 8 && v <= 15) && pointBuySpent(scores) <= POINT_BUY_BUDGET;
}

export function assignByPriority(primary: readonly AbilityKey[], rng: () => number): AbilityScores {
  const order = [...primary, ...shuffle(rng, ABILITY_KEYS.filter((k) => !primary.includes(k)))];

  return Object.fromEntries(order.map((k, i) => [k, STANDARD_ARRAY[i]])) as AbilityScores;
}

export const assignStandardArray = (archetype: HeroArchetypeKey, rng: () => number): AbilityScores => assignByPriority(ARCHETYPE_PRIMARY[archetype], rng);

export const classPrimaryAbilities = (cls: Pick<GameClassData, "spellcastingAbility" | "savingThrows">): AbilityKey[] => [
  ...new Set([...(cls.spellcastingAbility ? [cls.spellcastingAbility] : []), ...cls.savingThrows]),
];

const REST_ORDER: readonly AbilityKey[] = ["constitution", "dexterity", "wisdom", "intelligence", "charisma", "strength"];

export function recommendedScores(primary: readonly AbilityKey[]): AbilityScores {
  const order = [...new Set([...primary, ...REST_ORDER])];

  return Object.fromEntries(order.map((k, i) => [k, STANDARD_ARRAY[i]])) as AbilityScores;
}

export function recommendedPriority({ cls, archetype }: { cls?: Pick<GameClassData, "spellcastingAbility" | "savingThrows"> | null; archetype?: string | null }): AbilityKey[] | null {
  if (cls) return classPrimaryAbilities(cls);

  return archetype && archetype in ARCHETYPE_PRIMARY ? ARCHETYPE_PRIMARY[archetype as HeroArchetypeKey] : null;
}

export function isUntouchedScores(scores: AbilityScores, prevPriority: readonly AbilityKey[] | null): boolean {
  const same = (a: AbilityScores, b: AbilityScores) => ABILITY_KEYS.every((k) => a[k] === b[k]);

  return ABILITY_KEYS.every((k) => scores[k] === 10) || (prevPriority !== null && same(scores, recommendedScores(prevPriority)));
}

export function rerecommendScores(scores: AbilityScores, prevPriority: readonly AbilityKey[] | null, nextPriority: readonly AbilityKey[] | null): AbilityScores | null {
  return nextPriority && isUntouchedScores(scores, prevPriority) ? recommendedScores(nextPriority) : null;
}
