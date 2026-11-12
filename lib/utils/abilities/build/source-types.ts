import type { ResolvedAbility } from "@/types/abilities";

export interface SkillRowLike {
  id: string;
  name: string;
  icon?: string | null;
  spellGroupId?: string | null;
  abilities?: unknown;
}

export interface SkillEntry {
  row: SkillRowLike;
  mainSkillId: string | null;
  level: string | null;
  levelNode?: boolean;
  mainSkillSpellGroupId: string | null;
  personal?: boolean;
}

export interface ArtifactSetRowLike {
  id: string;
  name: string;
  icon?: string | null;
  setBonus?: unknown;
  abilities?: unknown;
}

export interface SourceInput {
  skills: SkillEntry[];
  completedSets: ArtifactSetRowLike[];
}

/** A module's contribution to a character's resolved abilities; `at` fixes where it lands relative to the core sources. */
export interface AbilitySourceHook {
  types: readonly ResolvedAbility["source"]["type"][];
  at: "head" | "afterArtifacts";
  collect(input: SourceInput): ResolvedAbility[];
}
