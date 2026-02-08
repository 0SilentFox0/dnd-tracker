export interface SkillForReference {
  id: string;
  name: string;
  description: string | null;
  appearanceDescription: string | null;
  combatStats: unknown;
  bonuses: unknown;
  skillTriggers: unknown;
  mainSkillName: string | null;
  grantedSpellName: string | null;
  icon: string | null;
  image: string | null;
}

export interface SpellForReference {
  id: string;
  name: string;
  level: number;
  type: string;
  damageType: string;
  castingTime: string | null;
  range: string | null;
  duration: string | null;
  description: string | null;
  effects: string[];
  savingThrow: unknown;
  diceCount: number | null;
  diceType: string | null;
  damageElement: string | null;
  appearanceDescription: string | null;
  groupName: string | null;
  icon: string | null;
}

export type SectionTab = "all" | "skills" | "spells";
