import { readSpellDefinition } from "@/lib/utils/spells/model/read";
import type { IdName } from "@/types/common";
import type { BookSpell, SpellDefinition, SpellRules } from "@/types/spells";

interface BookSpellRow {
  id: string;
  name: string;
  level: number;
  description: string | null;
  appearanceDescription?: string | null;
  icon: string | null;
  spellGroup: IdName | null;
  dice?: number;
  cost?: string;
  targeting?: unknown;
  resolution?: unknown;
  spellEffects?: unknown;
  stackable?: boolean;
  maxStacks?: number | null;
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
  };
}

export function toBookSpell(row: BookSpellRow): BookSpell {
  const { id, name, level, description, appearanceDescription, icon, spellGroup } = row;

  return { id, name, level, description, appearanceDescription, icon, spellGroup, ...spellRules(readSpellDefinition(row)) };
}
