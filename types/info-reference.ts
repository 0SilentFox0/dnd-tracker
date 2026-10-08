export interface SkillForReference {
  id: string;
  name: string;
  description: string | null;
  appearanceDescription: string | null;
  abilitySummary: string[];
  mainSkillId: string | null;
  mainSkillName: string | null;
  mainSkillIcon: string | null;
  mainSkillColor: string | null;
  grantedSpellName: string | null;
  icon: string | null;
  image: string | null;
}

export interface SpellForReference {
  id: string;
  name: string;
  level: number;
  /** підпис цілей заклинання (фільтр у довіднику) */
  type: string;
  cost: string;
  resolution: string;
  dice: number;
  description: string | null;
  /** описи ефектів із моделі вмінь, порахував сервер */
  effects: string[];
  appearanceDescription: string | null;
  groupName: string | null;
  icon: string | null;
}

export type SectionTab = "all" | "skills" | "spells";
