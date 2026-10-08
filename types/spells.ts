import type { Effect } from "@/lib/utils/abilities/schema";
import type { RaceModifier, SpellCost, SpellDefinition, SpellResolution, SpellTargeting } from "@/lib/utils/spells/model/schema";

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
  spellGroup?: {
    id: string;
    name: string;
  } | null;
}

export type SpellWithDefinition = Spell & { definition: SpellDefinition };

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
}

export type BookSpell = {
  id: string;
  name: string;
  level: number;
  description?: string | null;
  icon?: string | null;
  spellGroup?: { id: string; name: string } | null;
  dice?: number;
  cost?: SpellCost;
  targeting?: SpellTargeting;
  resolution?: SpellResolution;
};
