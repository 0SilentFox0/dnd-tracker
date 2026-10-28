import { readSpellDefinition } from "./read";

import { createSpellSchema } from "@/lib/schemas/spells";
import { parseSpellFx } from "@/lib/utils/battle/fx/spell-fx-schema";
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
    concentration: false,
    dieSides: null,
    upcastDice: null,
    upcastTargets: null,
    addAbilityMod: false,
    fx: {},
  };
}

export function spellToForm(spell: Spell): SpellFormData {
  const def = readSpellDefinition({ id: spell.id, dice: spell.dice, cost: spell.cost, targeting: spell.targeting, resolution: spell.resolution, spellEffects: spell.spellEffects, raceModifiers: spell.raceModifiers, stackable: spell.stackable, maxStacks: spell.maxStacks, concentration: spell.concentration, dieSides: spell.dieSides, upcastDice: spell.upcastDice, upcastTargets: spell.upcastTargets, addAbilityMod: spell.addAbilityMod, fixedDice: spell.fixedDice, damageBonus: spell.damageBonus });

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
    concentration: def.concentration === true,
    dieSides: def.dieSides ?? null,
    upcastDice: def.upcastDice ?? null,
    upcastTargets: def.upcastTargets ?? null,
    addAbilityMod: def.addAbilityMod === true,
    fixedDice: def.fixedDice,
    damageBonus: def.damageBonus,
    fx: parseSpellFx(spell.fx) ?? {},
    ...(spell.lists?.length && { lists: spell.lists }),
  };
}

const PATH_LABELS: Record<string, string> = {
  name: "Назва",
  level: "Рівень",
  groupId: "Школа",
  icon: "Іконка",
  description: "Опис",
  appearanceDescription: "Вигляд",
  cost: "Вартість",
  dice: "Базові кубики",
  targeting: "Цілі",
  "targeting.range": "Дальність",
  "targeting.size": "Розмір",
  "targeting.maxTargets": "Макс. цілей",
  "targeting.side": "Сторона",
  "targeting.shape": "Форма",
  "targeting.zone": "Небезпека",
  "targeting.zone.rounds": "Раундів небезпеки",
  resolution: "Перевірка",
  spellEffects: "Ефекти",
  raceModifiers: "Модифікатори рас",
  stackable: "Накопичення",
  maxStacks: "Макс. накопичень",
  dieSides: "Грані кубика",
  upcastDice: "Кубики за коло",
  upcastTargets: "Цілі за коло",
  fx: "Анімація",
};

function issueLabel(path: PropertyKey[]): string {
  const keys = path.filter((p) => typeof p !== "number").map(String);

  for (let n = keys.length; n > 0; n--) {
    const label = PATH_LABELS[keys.slice(0, n).join(".")];

    if (label) return label;
  }

  return "Заклинання";
}

function payloadInput(form: SpellFormData) {
  return { ...form, icon: form.icon || null, groupId: form.groupId || null, maxStacks: form.stackable ? form.maxStacks : null, fx: Object.values(form.fx).some(Boolean) ? form.fx : null, addAbilityMod: form.addAbilityMod || null, ...(form.lists && { lists: form.lists }) };
}

export function formToPayload(form: SpellFormData) {
  return createSpellSchema.parse(payloadInput(form));
}

/** Перший зрозумілий опис помилки для DM або null, якщо форма пройде серверну схему. */
export function spellFormError(form: SpellFormData): string | null {
  if (!form.name.trim()) return "Вкажіть назву заклинання";

  const parsed = createSpellSchema.safeParse(payloadInput(form));

  if (parsed.success) return null;

  const issue = parsed.error.issues[0];

  return `${issueLabel(issue.path)}: ${issue.message}`;
}
