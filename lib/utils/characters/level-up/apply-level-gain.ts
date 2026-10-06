import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import { calculateSpellSlotGain, type SpellSlots } from "@/lib/utils/spells/spell-slots";
import type { SpellSlotProgression } from "@/types/races";

export const ABILITY_SCORE_CAP = 30;

export interface LevelGainInput {
  character: Record<AbilityKey, number> & { spellSlots: unknown };
  race: { spellSlotProgression: unknown } | null;
  campaign: { maxLevel: number };
  fromLevel: number;
  toLevel: number;
  rng?: () => number;
}

export interface LevelGain {
  abilityScores: Record<AbilityKey, number>;
  spellSlots: SpellSlots;
  gained: AbilityKey[];
}

function readSlots(raw: unknown): SpellSlots {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? { ...(raw as SpellSlots) } : {};
}

function readProgression(race: LevelGainInput["race"]): SpellSlotProgression[] {
  return Array.isArray(race?.spellSlotProgression) ? (race.spellSlotProgression as SpellSlotProgression[]) : [];
}

export function applyLevelGain({ character, race, campaign, fromLevel, toLevel, rng = Math.random }: LevelGainInput): LevelGain {
  const abilityScores = Object.fromEntries(ABILITY_KEYS.map((k) => [k, character[k]])) as Record<AbilityKey, number>;

  const gained: AbilityKey[] = [];

  for (let level = fromLevel; level < toLevel; level++) {
    const open = ABILITY_KEYS.filter((k) => abilityScores[k] < ABILITY_SCORE_CAP);

    if (open.length === 0) break;

    const key = open[Math.floor(rng() * open.length)];

    abilityScores[key] += 1;
    gained.push(key);
  }

  const spellSlots = readSlots(character.spellSlots);

  for (const [key, slot] of Object.entries(calculateSpellSlotGain(fromLevel, toLevel, campaign.maxLevel, readProgression(race)))) {
    const prev = spellSlots[key];

    spellSlots[key] = prev ? { max: prev.max + slot.max, current: prev.current + slot.current } : slot;
  }

  return { abilityScores, spellSlots, gained };
}
