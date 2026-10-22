import { shuffle } from "./rng";

import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import type { HeroArchetypeKey } from "@/lib/constants/hero-archetypes";

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

export const ARCHETYPE_CLASS: Record<HeroArchetypeKey, string> = { warrior: "Воїн", paladin: "Паладин", ranger: "Слідопит", rogue: "Розбійник", mage: "Маг" };

export const pointBuySpent = (scores: AbilityScores) => ABILITY_KEYS.reduce((sum, k) => sum + (POINT_BUY_COST[scores[k]] ?? Infinity), 0);

export function validateAbilityScores(scores: AbilityScores, method: AbilityMethod): boolean {
  const values = ABILITY_KEYS.map((k) => scores[k]);

  if (values.some((v) => !Number.isInteger(v))) return false;

  if (method === "standard") return [...values].sort((a, b) => b - a).every((v, i) => v === STANDARD_ARRAY[i]);

  return values.every((v) => v >= 8 && v <= 15) && pointBuySpent(scores) <= POINT_BUY_BUDGET;
}

export function assignStandardArray(archetype: HeroArchetypeKey, rng: () => number): AbilityScores {
  const primary = ARCHETYPE_PRIMARY[archetype];

  const order = [...primary, ...shuffle(rng, ABILITY_KEYS.filter((k) => !primary.includes(k)))];

  return Object.fromEntries(order.map((k, i) => [k, STANDARD_ARRAY[i]])) as AbilityScores;
}
