export interface Skill {
  id: string;
  campaignId: string;
  name: string;
  description: string | null;
  icon: string | null;
  races: string[];
  isRacial: boolean;
  bonuses: Record<string, number>;
  damage: number | null;
  armor: number | null;
  speed: number | null;
  physicalResistance: number | null;
  magicalResistance: number | null;
  spellId: string | null;
  spellGroupId: string | null;
  mainSkillId?: string | null;
  spellEnhancementTypes?: string[];
  spellEffectIncrease?: number | null;
  spellTargetChange?: { target: string } | null;
  spellAdditionalModifier?: {
    modifier?: string;
    damageDice?: string;
    duration?: number;
  } | null;
  spellNewSpellId?: string | null;
  createdAt: Date;
  spell?: {
    id: string;
    name: string;
  } | null;
  spellGroup?: {
    id: string;
    name: string;
  } | null;
}

export interface UnlockedSkill {
  id: string;
  name: string;
  bonus?: number;
}

export interface CharacterSkill {
  id: string;
  characterId: string;
  skillTreeId: string;
  unlockedSkills: UnlockedSkill[];
  updatedAt: Date;
  skillTree?: {
    id: string;
    race: string;
  } | null;
}

// RACE_OPTIONS видалено - використовуйте раси з бази через useRaces hook
// BONUS_ATTRIBUTES видалено - використовуйте ABILITY_SCORES з @/lib/constants/abilities
