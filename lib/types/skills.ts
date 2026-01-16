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

export const RACE_OPTIONS = [
  { value: "human", label: "Людина" },
  { value: "elf", label: "Ельф" },
  { value: "dark_elf", label: "Темний Ельф" },
  { value: "necromancer", label: "Некромант" },
  { value: "demon", label: "Демон" },
  { value: "wizard", label: "Чародій" },
  { value: "dwarf", label: "Дворф" },
  { value: "orc", label: "Орк" },
] as const;

export const BONUS_ATTRIBUTES = [
  { value: "strength", label: "Сила" },
  { value: "dexterity", label: "Спритність" },
  { value: "constitution", label: "Тіло" },
  { value: "intelligence", label: "Інтелект" },
  { value: "wisdom", label: "Мудрість" },
  { value: "charisma", label: "Харизма" },
] as const;
