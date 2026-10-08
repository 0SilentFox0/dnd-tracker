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
    stackable: false,
    maxStacks: null,
  };
}

export function spellToForm(spell: Spell): SpellFormData {
  const def = readSpellDefinition({ id: spell.id, dice: spell.dice, cost: spell.cost, targeting: spell.targeting, resolution: spell.resolution, spellEffects: spell.spellEffects, raceModifiers: spell.raceModifiers, stackable: spell.stackable, maxStacks: spell.maxStacks });

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
    stackable: def.stackable === true,
    maxStacks: def.maxStacks ?? null,
  };
}

export function formToPayload(form: SpellFormData) {
  // заклинання 0-го рівня зі старих даних зберігає рівень, нові — лише 1–5 (перевіряє createSpellSchema на сервері)
  const parsed = createSpellSchema.parse({ ...form, level: Math.max(1, form.level), icon: form.icon || null, groupId: form.groupId || null, maxStacks: form.stackable ? form.maxStacks : null });

  return { ...parsed, level: form.level };
}

/** Перший зрозумілий опис помилки для DM або null, якщо форма валідна. */
export function spellFormError(form: SpellFormData): string | null {
  if (!form.name.trim()) return "Вкажіть назву заклинання";

  const parsed = SpellDefinitionSchema.safeParse({ dice: form.dice, cost: form.cost, targeting: form.targeting, resolution: form.resolution, effects: form.spellEffects, raceModifiers: form.raceModifiers, stackable: form.stackable, maxStacks: form.stackable ? (form.maxStacks ?? undefined) : undefined });

  if (parsed.success) return null;

  const issue = parsed.error.issues[0];

  return `${issue.path.join(".") || "заклинання"}: ${issue.message}`;
}
