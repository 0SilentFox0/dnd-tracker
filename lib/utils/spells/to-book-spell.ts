import { parseSpellFx } from "@/lib/utils/battle/fx/spell-fx-schema";
import { readSpellDefinition } from "@/lib/utils/spells/model/read";
import type { BookSpell, SpellDefinition, SpellGroupRef, SpellRules } from "@/types/spells";

interface BookSpellRow {
  id: string;
  name: string;
  level: number;
  description: string | null;
  appearanceDescription?: string | null;
  icon: string | null;
  spellGroup: SpellGroupRef | null;
  dice?: number;
  cost?: string;
  targeting?: unknown;
  resolution?: unknown;
  spellEffects?: unknown;
  stackable?: boolean;
  maxStacks?: number | null;
  dieSides?: number | null;
  upcastDice?: number | null;
  upcastTargets?: number | null;
  addAbilityMod?: boolean | null;
  fx?: unknown;
}

/** Rules for the battle-effect preview; stacking only when on, so the common case adds no keys. */
export function spellRules(def: SpellDefinition): SpellRules {
  return {
    dice: def.dice,
    cost: def.cost,
    targeting: def.targeting,
    resolution: def.resolution,
    spellEffects: def.effects,
    ...(def.stackable && { stackable: true, maxStacks: def.maxStacks ?? null }),
    ...(def.dieSides && { dieSides: def.dieSides }),
    ...(def.upcastDice !== undefined && { upcastDice: def.upcastDice }),
    ...(def.upcastTargets !== undefined && { upcastTargets: def.upcastTargets }),
    ...(def.addAbilityMod && { addAbilityMod: true }),
  };
}

export function toBookSpell(row: BookSpellRow): BookSpell {
  const { id, name, level, description, appearanceDescription, icon, spellGroup, fx } = row;

  const parsedFx = parseSpellFx(fx);

  return { id, name, level, description, appearanceDescription, icon, spellGroup, ...(parsedFx && { fx: parsedFx }), ...spellRules(readSpellDefinition(row)) };
}
