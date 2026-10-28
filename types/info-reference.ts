import type { SpellFx } from "@/lib/utils/battle/fx/spells";
import type { SpellRules } from "@/types/spells";


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
  fx?: SpellFx | null;
  rules?: SpellRules;
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

export interface FilterField<T, O = T[]> {
  value: T | null;
  set: (value: T | null) => void;
  options: O;
}

export interface ReferenceFilters {
  search: { value: string; set: (value: string) => void };
  section: { value: SectionTab; set: (value: SectionTab) => void };
  panel: { open: boolean; setOpen: (value: boolean | ((prev: boolean) => boolean)) => void };
  hasActive: boolean;
  clearAll: () => void;
  visible: { skills: boolean; spells: boolean; artifacts: boolean };
  skill: { mainSkill: FilterField<string> };
  spell: {
    level: FilterField<number>;
    group: FilterField<string>;
    type: FilterField<string>;
  };
  artifact: {
    rarity: FilterField<string>;
    slot: FilterField<string, { value: string; label: string }[]>;
    artifactSet: FilterField<string>;
  };
}
