import type { Effect } from "@/lib/utils/abilities/schema";
import type { RaceModifier, SpellCost, SpellResolution, SpellTargeting } from "@/lib/utils/spells/model/schema";
import type { IdName } from "@/types/common";

export type { RaceModifier, SpellCost, SpellDefinition, SpellResolution, SpellTargeting } from "@/lib/utils/spells/model/schema";

export interface Spell {
  id: string;
  name: string;
  level: number;
  description: string | null;
  groupId: string | null;
  icon: string | null;
  appearanceDescription?: string | null;
  dice: number;
  cost: string;
  targeting: unknown;
  resolution: unknown;
  spellEffects: unknown;
  raceModifiers: unknown;
  stackable?: boolean;
  maxStacks?: number | null;
  spellGroup?: IdName | null;
}

export interface SpellGroup {
  id: string;
  name: string;
}

export interface SpellFormData {
  name: string;
  level: number;
  groupId: string | null;
  icon: string | null;
  description: string | null;
  appearanceDescription: string | null;
  cost: SpellCost;
  dice: number;
  targeting: SpellTargeting;
  resolution: SpellResolution;
  spellEffects: Effect[];
  raceModifiers: RaceModifier[];
  stackable: boolean;
  maxStacks: number | null;
}

/** Columns `readSpellDefinition` needs to rebuild a spell for a dry-run cast (battle-effect preview). */
export interface SpellRules {
  dice?: number;
  cost?: SpellCost;
  targeting?: SpellTargeting;
  resolution?: SpellResolution;
  spellEffects?: Effect[];
  stackable?: boolean;
  maxStacks?: number | null;
}

export type BookSpell = SpellRules & {
  id: string;
  name: string;
  level: number;
  description?: string | null;
  appearanceDescription?: string | null;
  icon?: string | null;
  spellGroup?: IdName | null;
};
