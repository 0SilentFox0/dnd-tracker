import type { ComponentFlags, SpellIngredient } from "@/lib/schemas/spell-ingredients";
import type { SpellFx } from "@/lib/utils/battle/fx/spells";
import type { SpellEffect } from "@/lib/utils/spells/model/schema";
import type { RaceModifier, SpellCastingTime, SpellCost, SpellDefinition, SpellResolution, SpellTargeting } from "@/lib/utils/spells/model/schema";
import type { IdName } from "@/types/common";

export type { RaceModifier, SpellCastingTime, SpellCost, SpellDefinition, SpellResolution, SpellTargeting } from "@/lib/utils/spells/model/schema";

export type SpellGroupRef = IdName & { color?: string | null; icon?: string | null };

export interface Spell {
  executionMode?: "native" | "manual";
  id: string;
  name: string;
  level: number;
  description: string | null;
  groupId: string | null;
  icon: string | null;
  appearanceDescription?: string | null;
  dice: number;
  cost: string;
  casting?: SpellCastingTime | null;
  targeting: unknown;
  resolution: unknown;
  spellEffects: unknown;
  raceModifiers: unknown;
  stackable?: boolean;
  maxStacks?: number | null;
  concentration?: boolean;
  dieSides?: number | null;
  upcastDice?: number | null;
  upcastTargets?: number | null;
  addAbilityMod?: boolean | null;
  fixedDice?: boolean | null;
  damageBonus?: number | null;
  spellGroup?: SpellGroupRef | null;
  fx?: unknown;
  lists?: string[];
  ingredients?: SpellIngredient[];
  componentFlags?: ComponentFlags | null;
}

export interface SpellGroup {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
}

export interface SpellFormData {
  executionMode?: "native" | "manual";
  name: string;
  level: number;
  groupId: string | null;
  icon: string | null;
  description: string | null;
  appearanceDescription: string | null;
  cost: SpellCost;
  casting?: SpellCastingTime;
  dice: number;
  targeting: SpellTargeting;
  resolution: SpellResolution;
  spellEffects: SpellEffect[];
  raceModifiers: RaceModifier[];
  stackable: boolean;
  maxStacks: number | null;
  concentration?: boolean;
  dieSides?: number | null;
  upcastDice?: number | null;
  upcastTargets?: number | null;
  addAbilityMod?: boolean;
  fixedDice?: boolean;
  damageBonus?: number | null;
  fx: SpellFx;
  lists?: string[];
  ingredients?: SpellIngredient[];
  componentFlags?: ComponentFlags | null;
}

/** Columns `readSpellDefinition` needs to rebuild a spell for a dry-run cast (battle-effect preview). */
export interface SpellRules {
  executionMode?: "native" | "manual";
  dice?: number;
  cost?: SpellCost;
  casting?: SpellCastingTime;
  targeting?: SpellTargeting;
  resolution?: SpellResolution;
  spellEffects?: SpellEffect[];
  stackable?: boolean;
  maxStacks?: number | null;
  concentration?: boolean;
  dieSides?: SpellDefinition["dieSides"];
  upcastDice?: number;
  upcastTargets?: number;
  addAbilityMod?: boolean;
  fixedDice?: boolean;
  damageBonus?: number;
}

export type BookSpell = SpellRules & {
  id: string;
  name: string;
  level: number;
  description?: string | null;
  appearanceDescription?: string | null;
  icon?: string | null;
  spellGroup?: SpellGroupRef | null;
  fx?: SpellFx | null;
  /** плитка живого inline-гранту (grantCast): id = ключ гранту, касту йде hostSpellId + grantKey */
  grantKey?: string;
  hostSpellId?: string;
};
