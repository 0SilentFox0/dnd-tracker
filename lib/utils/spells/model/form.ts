import { readSpellDefinition } from "./read";

import type { ErrorParams } from "@/lib/constants/api-errors";
import { issueParams } from "@/lib/i18n/translate-issue";
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
    ingredients: [],
    componentFlags: null,
  };
}

export function spellToForm(spell: Spell): SpellFormData {
  const def = readSpellDefinition({ id: spell.id, dice: spell.dice, cost: spell.cost, casting: spell.casting, targeting: spell.targeting, resolution: spell.resolution, spellEffects: spell.spellEffects, raceModifiers: spell.raceModifiers, stackable: spell.stackable, maxStacks: spell.maxStacks, concentration: spell.concentration, dieSides: spell.dieSides, upcastDice: spell.upcastDice, upcastTargets: spell.upcastTargets, addAbilityMod: spell.addAbilityMod, fixedDice: spell.fixedDice, damageBonus: spell.damageBonus });

  return {
    executionMode: spell.executionMode,
    name: spell.name,
    level: spell.level,
    groupId: spell.groupId,
    icon: spell.icon,
    description: spell.description,
    appearanceDescription: spell.appearanceDescription ?? null,
    cost: def.cost,
    casting: def.casting,
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
    ...(spell.ingredients?.length && { ingredients: spell.ingredients }),
    ...(spell.componentFlags && { componentFlags: spell.componentFlags }),
    ...(spell.components && { components: spell.components }),
  };
}

const KNOWN_PATHS = new Set([
  "name", "level", "groupId", "icon", "description", "appearanceDescription", "cost", "dice", "targeting",
  "targeting.range", "targeting.size", "targeting.maxTargets", "targeting.side", "targeting.shape", "targeting.zone",
  "targeting.zone.rounds", "resolution", "spellEffects", "raceModifiers", "stackable", "maxStacks", "dieSides",
  "upcastDice", "upcastTargets", "fx", "ingredients", "componentFlags",
]);

const camelPath = (keys: string[]) => keys.map((k, i) => (i ? k[0].toUpperCase() + k.slice(1) : k)).join("");

function issueFieldKey(path: PropertyKey[]): string {
  const keys = path.filter((p) => typeof p !== "number").map(String);

  for (let n = keys.length; n > 0; n--) {
    if (KNOWN_PATHS.has(keys.slice(0, n).join("."))) return `spellEditor.fields.${camelPath(keys.slice(0, n))}`;
  }

  return "spellEditor.fields.spell";
}

function payloadInput(form: SpellFormData) {
  const { components: _legacy, ...rest } = form;

  return { ...rest, ingredients: form.ingredients ?? [], componentFlags: form.componentFlags ?? null, icon: form.icon || null, groupId: form.groupId || null, maxStacks: form.stackable ? form.maxStacks : null, fx: Object.values(form.fx).some(Boolean) ? form.fx : null, addAbilityMod: form.addAbilityMod || null, ...(form.lists && { lists: form.lists }) };
}

export function formToPayload(form: SpellFormData) {
  return createSpellSchema.parse(payloadInput(form));
}

export interface SpellFormIssue {
  fieldKey: string | null;
  message: string;
  params?: ErrorParams;
}

/** First problem the server schema would reject, or null; `fieldKey`/`message` are translation keys. */
export function spellFormIssue(form: SpellFormData): SpellFormIssue | null {
  if (!form.name.trim()) return { fieldKey: null, message: "spellEditor.validation.nameRequired" };

  const parsed = createSpellSchema.safeParse(payloadInput(form));

  if (parsed.success) return null;

  const issue = parsed.error.issues[0];

  return { fieldKey: issueFieldKey(issue.path), message: issue.message, params: issueParams(issue as { message: string; params?: ErrorParams }) };
}
