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

const met = (req: Requirement, scores: Readonly<Record<AbilityKey, number>>) => req.every((group) => group.some((a) => scores[a] >= MULTICLASS_MIN_SCORE));

/** Classes without a requirement entry (custom, HOMM) never block. */
export function multiclassBlockedBy(current: readonly Pick<GameClassData, "name">[], next: Pick<GameClassData, "name">, scores: Readonly<Record<AbilityKey, number>>): string | null {
  for (const cls of [...current, next]) {
    const req = multiclassRequirement(cls);

    if (req && !met(req, scores)) return cls.name;
  }

  return null;
}
