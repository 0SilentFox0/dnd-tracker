import type { Effect } from "@/lib/utils/abilities/schema";
import type { SpellFx } from "@/lib/utils/battle/fx/spells";
import type { RaceModifier, SpellCost, SpellDefinition, SpellResolution, SpellTargeting } from "@/lib/utils/spells/model/schema";
import type { IdName } from "@/types/common";

export type { RaceModifier, SpellCost, SpellDefinition, SpellResolution, SpellTargeting } from "@/lib/utils/spells/model/schema";

export type SpellGroupRef = IdName & { color?: string | null; icon?: string | null };

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
}

export interface SpellGroup {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
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
  concentration?: boolean;
  dieSides?: number | null;
  upcastDice?: number | null;
  upcastTargets?: number | null;
  addAbilityMod?: boolean;
  fixedDice?: boolean;
  damageBonus?: number | null;
  fx: SpellFx;
  lists?: string[];
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
};
