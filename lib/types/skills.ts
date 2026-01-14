/**
 * Типи для дерева скілів
 */

export interface UnlockedSkill {
  name: string;
  id: string;
  bonus?: number;
  [key: string]: unknown;
}

export interface CharacterSkill {
  skillTreeId: string;
  unlockedSkills: UnlockedSkill[];
}
