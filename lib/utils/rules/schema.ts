import { z } from "zod";

import { DEFAULT_RULES } from "./defaults";

import { RULES_EDITIONS } from "@/lib/constants/rules";
import { StaticEffectSchema } from "@/lib/utils/abilities/schema/effects";
import { CONDITION_KEYS, CUSTOM_CONDITION_KEY_RE } from "@/lib/utils/abilities/schema/kinds";
import { isRecord } from "@/lib/utils/common/is-record";

const level = z.string().regex(/^([1-9]|1\d|20)$/);

const DiceTable = z.record(level, z.string().regex(/^\d+d\d+([+-]\d+d\d+)*$/));

const INITIATIVE_ORDER_MESSAGE = "rules.validation.initiativeOrder";

const CRITICALS_ORDER_MESSAGE = "rules.validation.criticalsOrder";

const CustomConditionSchema = z.object({
  key: z.string().regex(CUSTOM_CONDITION_KEY_RE),
  name: z.string().min(1).max(60),
  description: z.string().max(2000),
  markers: z.array(z.enum(CONDITION_KEYS)).max(10),
  abilityEffects: z.array(StaticEffectSchema).max(10).optional(),
});

const sectionSchemas = {
  morale: z.strictObject({ enabled: z.boolean(), cap: z.number().int().min(1).max(10) }),
  criticals: z.strictObject({
    critOn: z.number().int().min(2).max(20),
    fumbleOn: z.number().int().min(0).max(5),
    effects: z.boolean(),
    doubleDice: z.boolean(),
    disabledSuccess: z.array(z.string()),
    disabledFail: z.array(z.string()),
  }),
  formulas: z.strictObject({
    saveDcBase: z.number().int().min(0).max(20),
    proficiencyBase: z.number().int().min(0).max(10),
    proficiencyEvery: z.number().int().min(1).max(20),
  }),
  heroScaling: z.strictObject({
    meleeDiceByLevel: DiceTable.nullable(),
    rangedDiceByLevel: DiceTable.nullable(),
    hpBaseLevels: z.number().int().min(0).max(10),
    hpConCoefficient: z.number().min(0).max(5),
  }),
  initiative: z.strictObject({
    heroMin: z.number().int().min(0).max(50),
    heroMax: z.number().int().min(0).max(50),
    mode: z.enum(["roll", "static"]),
  }),
  defaultAttacks: z.strictObject({
    meleeName: z.string().trim().min(1).max(60),
    rangedName: z.string().trim().min(1).max(60),
  }),
  saves: z.strictObject({ proficiency: z.boolean() }),
  deathSaves: z.strictObject({ enabled: z.boolean(), unitsDieAtZero: z.boolean() }),
  concentration: z.strictObject({ enabled: z.boolean(), dcCap: z.number().int().min(10).max(99).nullable() }),
  conditions: z.strictObject({ enabled: z.boolean(), exhaustion: z.enum(RULES_EDITIONS), custom: z.array(CustomConditionSchema).max(50).optional() }),
  actions: z.strictObject({ enabled: z.boolean(), opportunityAttacks: z.boolean(), retaliation: z.boolean(), variant: z.enum(RULES_EDITIONS) }),
  classes: z.strictObject({ enabled: z.boolean() }),
  outOfCombat: z.strictObject({
    persistResources: z.boolean(),
    longRestHitDice: z.enum(["half", "all"]),
    xp: z.boolean(),
    inspiration: z.boolean(),
  }),
  encounters: z.strictObject({
    balance: z.enum(["fair", "xp"]),
    edition: z.enum(RULES_EDITIONS),
    autoXp: z.boolean(),
  }),
  items: z.strictObject({ enabled: z.boolean(), attunementLimit: z.number().int().min(1).max(10) }),
  spellIngredients: z.strictObject({ enabled: z.boolean(), autoPay: z.boolean() }),
};

// Виводимо тип до застосування defaults: DEFAULT_RULES типізований через Ruleset.
export type Ruleset = { [K in keyof typeof sectionSchemas]: z.output<(typeof sectionSchemas)[K]> };

type Optional<F extends z.ZodType> = undefined extends z.output<F> ? F : never;

type WithDefaults<S extends Record<string, z.ZodType>> = { [K in keyof S]: S[K] extends Optional<S[K]> ? S[K] : z.ZodDefault<S[K]> };

function withDefaults<S extends Record<string, z.ZodType>>(
  section: z.ZodObject<S>,
  defaults: { [K in keyof S as S[K] extends Optional<S[K]> ? never : K]: z.core.util.NoUndefined<z.output<S[K]>> },
) {
  const fields = Object.entries(section.shape) as [keyof S, S[keyof S]][];

  const shape = Object.fromEntries(
    fields.map(([key, field]) => [key, key in defaults ? field.default((defaults as unknown as Record<keyof S, never>)[key]) : field]),
  ) as WithDefaults<S>;

  return z.strictObject(shape);
}

const sections = {
  morale: withDefaults(sectionSchemas.morale, DEFAULT_RULES.morale),
  criticals: withDefaults(sectionSchemas.criticals, DEFAULT_RULES.criticals),
  formulas: withDefaults(sectionSchemas.formulas, DEFAULT_RULES.formulas),
  heroScaling: withDefaults(sectionSchemas.heroScaling, DEFAULT_RULES.heroScaling),
  initiative: withDefaults(sectionSchemas.initiative, DEFAULT_RULES.initiative),
  defaultAttacks: withDefaults(sectionSchemas.defaultAttacks, DEFAULT_RULES.defaultAttacks),
  saves: withDefaults(sectionSchemas.saves, DEFAULT_RULES.saves),
  deathSaves: withDefaults(sectionSchemas.deathSaves, DEFAULT_RULES.deathSaves),
  concentration: withDefaults(sectionSchemas.concentration, DEFAULT_RULES.concentration),
  conditions: withDefaults(sectionSchemas.conditions, DEFAULT_RULES.conditions),
  actions: withDefaults(sectionSchemas.actions, DEFAULT_RULES.actions),
  classes: withDefaults(sectionSchemas.classes, DEFAULT_RULES.classes),
  outOfCombat: withDefaults(sectionSchemas.outOfCombat, DEFAULT_RULES.outOfCombat),
  encounters: withDefaults(sectionSchemas.encounters, DEFAULT_RULES.encounters),
  items: withDefaults(sectionSchemas.items, DEFAULT_RULES.items),
  spellIngredients: withDefaults(sectionSchemas.spellIngredients, DEFAULT_RULES.spellIngredients),
};

type Sections = typeof sections;

const criticalsOrdered = (v: { critOn: number; fumbleOn: number }) => v.fumbleOn < v.critOn;

const optionalWithoutDefault = (shape: z.ZodRawShape) =>
  z.strictObject(Object.fromEntries(Object.entries(shape).map(([k, v]) => [k, ((v instanceof z.ZodDefault ? v.unwrap() : v) as z.ZodType).optional()])));

const patchSection = <K extends keyof Sections>(k: K) => optionalWithoutDefault(sections[k].shape) as z.ZodObject<{ [F in keyof Sections[K]["shape"]]: z.ZodOptional<z.ZodType<z.output<Sections[K]["shape"][F]>>> }, z.core.$strict>;

const initiativeOrdered = (v: { heroMin?: number; heroMax?: number }) =>
  v.heroMin === undefined || v.heroMax === undefined || v.heroMin <= v.heroMax;

export const RulesetSchema = z
  .object({
    morale: sections.morale.prefault({}),
    criticals: sections.criticals.prefault({}),
    formulas: sections.formulas.prefault({}),
    heroScaling: sections.heroScaling.prefault({}),
    initiative: sections.initiative.prefault({}),
    defaultAttacks: sections.defaultAttacks.prefault({}),
    saves: sections.saves.prefault({}),
    deathSaves: sections.deathSaves.prefault({}),
    concentration: sections.concentration.prefault({}),
    conditions: sections.conditions.prefault({}),
    actions: sections.actions.prefault({}),
    classes: sections.classes.prefault({}),
    outOfCombat: sections.outOfCombat.prefault({}),
    encounters: sections.encounters.prefault({}),
    items: sections.items.prefault({}),
    spellIngredients: sections.spellIngredients.prefault({}),
  })
  .refine((r) => initiativeOrdered(r.initiative), { message: INITIATIVE_ORDER_MESSAGE, path: ["initiative"] })
  .refine((r) => criticalsOrdered(r.criticals), { message: CRITICALS_ORDER_MESSAGE, path: ["criticals"] });

export function parseRules(raw: unknown): Ruleset {
  const obj = isRecord(raw) ? raw : {};

  return Object.fromEntries(
    (Object.keys(sections) as (keyof Sections)[]).map((k) => {
      const parsed = sections[k].safeParse(obj[k] ?? {});

      const valid =
        parsed.success &&
        (k !== "initiative" || initiativeOrdered(parsed.data as Ruleset["initiative"])) &&
        (k !== "criticals" || criticalsOrdered(parsed.data as Ruleset["criticals"]));

      return [k, valid ? parsed.data : DEFAULT_RULES[k]];
    }),
  ) as Ruleset;
}

const RULES_CACHE_LIMIT = 50;

const rulesCache = new Map<string, Ruleset>();

export function parseRulesCached(raw: unknown): Ruleset {
  const key = JSON.stringify(raw ?? null);

  const hit = rulesCache.get(key);

  if (hit) {
    rulesCache.delete(key);
    rulesCache.set(key, hit);

    return hit;
  }

  const parsed = parseRules(raw);

  rulesCache.set(key, parsed);

  if (rulesCache.size > RULES_CACHE_LIMIT) rulesCache.delete(rulesCache.keys().next().value as string);

  return parsed;
}

export const RulesetPatchSchema = z
  .strictObject({
    morale: patchSection("morale").optional(),
    criticals: patchSection("criticals").optional(),
    formulas: patchSection("formulas").optional(),
    heroScaling: patchSection("heroScaling").optional(),
    initiative: patchSection("initiative").optional(),
    defaultAttacks: patchSection("defaultAttacks").optional(),
    saves: patchSection("saves").optional(),
    deathSaves: patchSection("deathSaves").optional(),
    concentration: patchSection("concentration").optional(),
    conditions: patchSection("conditions").optional(),
    actions: patchSection("actions").optional(),
    classes: patchSection("classes").optional(),
    outOfCombat: patchSection("outOfCombat").optional(),
    encounters: patchSection("encounters").optional(),
    items: patchSection("items").optional(),
    spellIngredients: patchSection("spellIngredients").optional(),
    removeCustomConditions: z.array(z.string().regex(CUSTOM_CONDITION_KEY_RE)).min(1).max(50).optional(),
  })
  .refine((p) => !p.initiative || initiativeOrdered(p.initiative), { message: INITIATIVE_ORDER_MESSAGE, path: ["initiative"] });

export type MergeRulesResult = { ok: true; rules: Ruleset } | { ok: false; issues: z.core.$ZodIssue[] };

type MergePatch = Record<string, Record<string, unknown> | string[] | undefined> & { removeCustomConditions?: string[] };

export function mergeRules(current: Ruleset, patch: MergePatch): MergeRulesResult {
  const removed = new Set(patch.removeCustomConditions ?? []);

  const sections = patch as Record<string, Record<string, unknown> | undefined>;

  const conflict = (Array.isArray(sections.conditions?.custom) ? (sections.conditions.custom as unknown[]) : []).find((c) => isRecord(c) && removed.has(String(c.key)));

  if (conflict) return { ok: false, issues: [{ code: "custom", message: "validation.rulesCustomConflict", path: ["removeCustomConditions"], input: patch.removeCustomConditions }] };

  const next = Object.fromEntries((Object.keys(current) as (keyof Ruleset)[]).map((k) => [k, { ...current[k], ...(sections[k] ?? {}) }]));

  const patchedCustom = sections.conditions?.custom;

  if (Array.isArray(patchedCustom)) {
    const keyOf = (c: unknown) => (isRecord(c) ? c.key : undefined);

    const incoming = new Set(patchedCustom.map(keyOf));

    next.conditions = { ...next.conditions, custom: [...(current.conditions.custom ?? []).filter((c) => !incoming.has(c.key)), ...patchedCustom] };
  }

  if (removed.size) next.conditions = { ...next.conditions, custom: ((next.conditions as Ruleset["conditions"]).custom ?? []).filter((c) => !removed.has(c.key)) };

  const parsed = RulesetSchema.safeParse(next);

  return parsed.success ? { ok: true, rules: parsed.data } : { ok: false, issues: parsed.error.issues };
}

export type RulesetPatch = z.infer<typeof RulesetPatchSchema>;
