import type { AbilityKey } from "@/lib/constants/abilities";
import type { GameClassData } from "@/types/classes";

export const MULTICLASS_MIN_SCORE = 13;

type Requirement = AbilityKey[][];

// every group must be met by at least one of its abilities
const SRD_MULTICLASS: Record<string, Requirement> = {
  barbarian: [["strength"]],
  bard: [["charisma"]],
  cleric: [["wisdom"]],
  druid: [["wisdom"]],
  fighter: [["strength", "dexterity"]],
  monk: [["dexterity"], ["wisdom"]],
  paladin: [["strength"], ["charisma"]],
  ranger: [["dexterity"], ["wisdom"]],
  rogue: [["dexterity"]],
  sorcerer: [["charisma"]],
  warlock: [["charisma"]],
  wizard: [["intelligence"]],
};

export const multiclassRequirement = (cls: Pick<GameClassData, "name">): Requirement | null => SRD_MULTICLASS[cls.name.trim().toLowerCase()] ?? null;

export interface MulticlassReason {
  className: string;
  abilities: AbilityKey[];
  need: number;
  have: number;
}

type Scores = Readonly<Record<AbilityKey, number>>;

export function multiclassReasons(current: readonly Pick<GameClassData, "name">[], next: Pick<GameClassData, "name">, scores: Scores): MulticlassReason[] {
  const out: MulticlassReason[] = [];

  for (const cls of [...current, next]) {
    for (const abilities of multiclassRequirement(cls) ?? []) {
      const have = Math.max(...abilities.map((a) => scores[a]));

      if (have < MULTICLASS_MIN_SCORE) out.push({ className: cls.name, abilities, need: MULTICLASS_MIN_SCORE, have });
    }
  }

  return out;
}

/** Classes without a requirement entry (custom, HOMM) never block. */
export const multiclassBlockedBy = (current: readonly Pick<GameClassData, "name">[], next: Pick<GameClassData, "name">, scores: Scores): string | null => multiclassReasons(current, next, scores)[0]?.className ?? null;
