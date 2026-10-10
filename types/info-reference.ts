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

export interface ArtifactForReference {
  id: string;
  name: string;
  icon: string | null;
  rarity: string | null;
  slot: string;
  slotLabel: string;
  description: string | null;
  effects: string[];
  setName: string | null;
  holderName: string | null;
}

export interface ArtifactSetForReference {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  bonuses: string[];
  artifactNames: string[];
}

export type SectionTab = "all" | "skills" | "spells" | "artifacts";
