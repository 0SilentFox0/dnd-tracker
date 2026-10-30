import { ComponentFlagsSchema, SpellIngredientsSchema } from "@/lib/schemas/spell-ingredients";
import { parseSpellFx } from "@/lib/utils/battle/fx/spell-fx-schema";
import { readSpellDefinition } from "@/lib/utils/spells/model/read";
import type { BookSpell, SpellDefinition, SpellGroupRef, SpellRules } from "@/types/spells";

interface BookSpellRow {
  executionMode?: string;
  id: string;
  name: string;
  level: number;
  description: string | null;
  appearanceDescription?: string | null;
  icon: string | null;
  spellGroup: SpellGroupRef | null;
  dice?: number;
  cost?: string;
  casting?: unknown;
  targeting?: unknown;
  resolution?: unknown;
  spellEffects?: unknown;
  stackable?: boolean;
  maxStacks?: number | null;
  dieSides?: number | null;
  upcastDice?: number | null;
  upcastTargets?: number | null;
  addAbilityMod?: boolean | null;
  fixedDice?: boolean | null;
  damageBonus?: number | null;
  fx?: unknown;
  ingredients?: unknown;
  componentFlags?: unknown;
  components?: string | null;
}

/** Rules for the battle-effect preview; stacking only when on, so the common case adds no keys. */
export function spellRules(def: SpellDefinition): SpellRules {
  return {
    ...(def.executionMode && { executionMode: def.executionMode }),
    dice: def.dice,
    cost: def.cost,
    casting: def.casting,
    targeting: def.targeting,
    resolution: def.resolution,
    spellEffects: def.effects,
    ...(def.stackable && { stackable: true, maxStacks: def.maxStacks ?? null }),
    ...(def.dieSides && { dieSides: def.dieSides }),
    ...(def.upcastDice !== undefined && { upcastDice: def.upcastDice }),
    ...(def.upcastTargets !== undefined && { upcastTargets: def.upcastTargets }),
    ...(def.addAbilityMod && { addAbilityMod: true }),
    ...(def.fixedDice && { fixedDice: true }),
    ...(def.damageBonus !== undefined && { damageBonus: def.damageBonus }),
  };
}

export function toBookSpell(row: BookSpellRow): BookSpell {
  const { id, name, level, description, appearanceDescription, icon, spellGroup, fx } = row;

  const parsedFx = parseSpellFx(fx);

  const ingredients = SpellIngredientsSchema.safeParse(row.ingredients).data;

  const componentFlags = ComponentFlagsSchema.safeParse(row.componentFlags).data;

  return { id, name, level, description, appearanceDescription, icon, spellGroup, ...(parsedFx && { fx: parsedFx }), ...(ingredients?.length && { ingredients }), ...(componentFlags && { componentFlags }), ...(row.components && { components: row.components }), ...spellRules(readSpellDefinition(row)) };
}
