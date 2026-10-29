import type { AbilityKey } from "@/lib/constants/abilities";
import type { CHOICE_KINDS, FEAT_TYPES } from "@/lib/constants/choices";
import type { DndSkill } from "@/lib/constants/skills";
import type { Ability } from "@/types/abilities";
import type { CharacterClassEntry } from "@/types/classes";
import type { TextRef } from "@/types/text";

export type { TextRef };

export type TextParams = Record<string, string | number>;

export type ChoiceKind = (typeof CHOICE_KINDS)[number];

export type FeatType = (typeof FEAT_TYPES)[number];

export type ChoiceOwner = "race" | "class" | "feat" | "background";

export interface SpellGrantPolicy {
  sharedPool?: string;
  uses: number | "proficiency";
  rest: "short" | "long";
  castLevel?: number;
  via?: "grant" | "slotOrGrant";
  dcAbility?: AbilityKey;
}

export interface SelectedSpellGrant {
  spellId: string;
  label: string;
  sourceKey: string;
  grantPolicy: SpellGrantPolicy;
}

export interface ChoiceOption {
  id: string;
  name: string;
  description?: string;
  /** рівень власника: у класі — рівень у класі, у расі — загальний */
  minLevel?: number;
  /** id інших опцій цього ж вибору */
  requires?: string[];
  abilities: Ability[];
  /** лише раса: відомі з загального рівня `level` */
  spells?: { level: number; spellId: string; grant?: SpellGrantPolicy }[];
}

export interface Choice {
  id: string;
  label: string;
  description?: string;
  level: number;
  count: number | { scale: string };
  lineage?: true;
  kind: ChoiceKind;
  options?: ChoiceOption[];
  featTypes?: FeatType[];
  skills?: DndSkill[];
  abilities?: AbilityKey[];
  points?: number;
  max?: number;
  maxPerAbility?: number;
  spells?: { lists: string[]; minLevel: number; maxLevel: number | "slots" };
  grant?: SpellGrantPolicy;
}

export interface ChoicePick {
  id: string;
  /** лише пік риси: вкладені вибори цієї риси */
  picks?: Picks;
}

export type Picks = Record<string, ChoicePick[]>;

export interface CharacterFeat {
  id: string;
  picks?: Picks;
  source: "origin" | "dm";
}

export interface FeatPrerequisite {
  manualText?: string[];
  level?: number;
  /** «будь-яка з» характеристик не нижче `min` */
  scores?: { abilities: AbilityKey[]; min: number };
  text?: string;
}

export interface FeatData {
  id: string;
  name: string;
  icon: string | null;
  type: FeatType;
  prerequisite: FeatPrerequisite;
  repeatable: boolean;
  description: string | null;
  abilities: Ability[];
  choices: Choice[];
}

export type FeatFormData = Omit<FeatData, "id">;

export interface SpellRef {
  id: string;
  name: string;
  level: number;
  lists: string[];
}

export interface ChoiceRace {
  id: string;
  name: string;
  choices: Choice[];
}

export interface ChoicesState {
  backgroundId?: string | null;
  backgroundChoices?: Picks;
  backgroundFeatPicks?: Picks;
  raceChoices: Picks;
  feats: CharacterFeat[];
  classes: CharacterClassEntry[];
}

export type ChoiceErrorCode =
  | "CHOICE_UNKNOWN"
  | "CHOICE_COUNT"
  | "CHOICE_DUPLICATE"
  | "CHOICE_LOCKED"
  | "CHOICE_MIN_LEVEL"
  | "CHOICE_REQUIRES"
  | "FEAT_TYPE"
  | "FEAT_PREREQUISITE"
  | "FEAT_NOT_REPEATABLE"
  | "SKILL_NOT_ALLOWED"
  | "EXPERTISE_NEEDS_PROFICIENCY"
  | "SPELL_NOT_IN_LIST"
  | "ABILITY_SCORE_CAP"
  | "CHOICES_NEED_CLASSES"
  | "ORIGIN_FEAT_ONLY_ONE"
  | "DM_FEAT_ONLY_DM";

export interface ChoiceIssue {
  /** "raceChoices.elven-lineage", "classes.<classId>.metamagic", "feats.0.<choiceId>" */
  path: string;
  code: ChoiceErrorCode;
  message: string;
  params?: { detail: string };
}

export interface ChoicesBody {
  backgroundId?: string | null;
  backgroundChoices?: Picks;
  backgroundFeatPicks?: Picks;
  raceChoices?: Picks;
  feats?: CharacterFeat[];
  classChoices?: Record<string, Picks>;
}

export interface SheetChoices {
  background?: { id: string; name: string; equipmentText: string | null; picks: TextRef[] };
  pending: number;
  /** ДМ, або власник при allowPlayerEdit і не на розгляді */
  canEdit?: boolean;
  lineage: string | null;
  feats: Array<{ key: string; id: string; name: string; type: FeatType; from: TextRef; picks: TextRef[] }>;
  options: Array<{ owner: string; label: string; names: string[] }>;
  spellSources: Record<string, TextRef>;
  expertise: DndSkill[];
}
