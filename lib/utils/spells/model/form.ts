import { readSpellDefinition } from "./read";
import { SpellDefinitionSchema } from "./schema";

import { createSpellSchema } from "@/lib/schemas/spells";
import type { Spell, SpellFormData } from "@/types/spells";

export function defaultSpellForm(): SpellFormData {
  return {
    name: "",
    level: 1,
    groupId: null,
    icon: null,
    description: null,
    appearanceDescription: null,
    cost: "action",
    dice: 0,
    targeting: { kind: "enemy" },
    resolution: { kind: "auto" },
    spellEffects: [],
    raceModifiers: [],
  };
}

export function spellToForm(spell: Spell): SpellFormData {
  const def = readSpellDefinition({ id: spell.id, dice: spell.dice, cost: spell.cost, targeting: spell.targeting, resolution: spell.resolution, spellEffects: spell.spellEffects, raceModifiers: spell.raceModifiers });

  return {
    name: spell.name,
    level: spell.level,
    groupId: spell.groupId,
    icon: spell.icon,
    description: spell.description,
    appearanceDescription: spell.appearanceDescription ?? null,
    cost: def.cost,
    dice: def.dice,
    targeting: def.targeting,
    resolution: def.resolution,
    spellEffects: def.effects,
    raceModifiers: def.raceModifiers,
  };
}

export function formToPayload(form: SpellFormData) {
  return createSpellSchema.parse({ ...form, icon: form.icon || null, groupId: form.groupId || null });
}

/** Перший зрозумілий опис помилки для DM або null, якщо форма валідна. */
export function spellFormError(form: SpellFormData): string | null {
  if (!form.name.trim()) return "Вкажіть назву заклинання";

  const parsed = SpellDefinitionSchema.safeParse({ dice: form.dice, cost: form.cost, targeting: form.targeting, resolution: form.resolution, effects: form.spellEffects, raceModifiers: form.raceModifiers });

  if (parsed.success) return null;

  const issue = parsed.error.issues[0];

  return `${issue.path.join(".") || "заклинання"}: ${issue.message}`;
}
