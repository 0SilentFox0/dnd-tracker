import { readSpellDefinition } from "./read";

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
  // заклинання 0-го рівня зі старих даних зберігає рівень, нові — лише 1–5 (перевіряє createSpellSchema на сервері)
  return { ...form, level: Math.max(1, form.level), icon: form.icon || null, groupId: form.groupId || null, maxStacks: form.stackable ? form.maxStacks : null };
}

export function formToPayload(form: SpellFormData) {
  return { ...createSpellSchema.parse(payloadInput(form)), level: form.level };
}

/** Перший зрозумілий опис помилки для DM або null, якщо форма пройде серверну схему. */
export function spellFormError(form: SpellFormData): string | null {
  if (!form.name.trim()) return "Вкажіть назву заклинання";

  const parsed = createSpellSchema.safeParse(payloadInput(form));

  if (parsed.success) return null;

  const issue = parsed.error.issues[0];

  return `${issueLabel(issue.path)}: ${issue.message}`;
}
