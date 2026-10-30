import type { ErrorParams } from "@/lib/constants/api-errors";
import type { AbilityFlowSummary, Segment } from "@/lib/utils/abilities/segments";
import type { SpellFx } from "@/lib/utils/battle/fx/spells";
import type { SpellCost, SpellResolution, SpellTargeting } from "@/lib/utils/spells/model/schema";
import type { SpellRules } from "@/types/spells";


export interface SkillForReference {
  id: string;
  name: string;
  description: string | null;
  appearanceDescription: string | null;
  abilitySummary: AbilityFlowSummary[];
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
  targeting: SpellTargeting;
  /** стабільний id цілей для фільтра довідника */
  facetKey: string;
  cost: SpellCost;
  resolution: SpellResolution;
  dice: number;
  description: string | null;
  /** описи ефектів із моделі вмінь як сегменти (мовонезалежні, рендер на клієнті) */
  effects: Segment[][];
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
  description: string | null;
  effects: AbilityFlowSummary[];
  setName: string | null;
  holderName: string | null;
  gear?: true;
}

export interface ArtifactSetForReference {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  bonuses: AbilityFlowSummary[];
  artifactNames: string[];
}

export interface ClassFeatureForReference {
  level: number;
  name: string | null;
  icon?: string | null;
  description: string | null;
}

export interface ClassSummaryLine {
  key: string;
  params?: ErrorParams;
}

export interface ClassForReference {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  summary: ClassSummaryLine[];
  features: ClassFeatureForReference[];
  subclasses: { id: string; name: string; icon: string | null; features: ClassFeatureForReference[] }[];
}

export type SectionTab = "all" | "skills" | "spells" | "artifacts" | "classes";

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
  classMode: boolean;
  clearAll: () => void;
  visible: { skills: boolean; spells: boolean; artifacts: boolean; classes: boolean };
  skill: { mainSkill: FilterField<string> };
  spell: {
    level: FilterField<number>;
    group: FilterField<string>;
    type: FilterField<string, { value: string; label: string }[]>;
  };
  artifact: {
    rarity: FilterField<string>;
    slot: FilterField<string, { value: string; label: string }[]>;
    artifactSet: FilterField<string>;
  };
}
