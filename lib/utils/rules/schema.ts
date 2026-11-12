import { z } from "zod";

import { DEFAULT_RULES } from "./defaults";
import { ALL_SECTIONS } from "./section-registry";
import { CRITICALS_ORDER_MESSAGE, INITIATIVE_ORDER_MESSAGE, type Ruleset, sectionSchemas } from "./section-shapes";
import { parseSection } from "./sections";

import { CUSTOM_CONDITION_KEY_RE } from "@/lib/utils/abilities/schema/kinds";
import { isRecord } from "@/lib/utils/common/is-record";
import { validateComposition } from "@/lib/utils/rules/systems/compose";

export type { Ruleset };

const UNKNOWN_MODULE_MESSAGE = "rules.validation.unknownModule";

const INVALID_COMPOSITION_MESSAGE = "rules.validation.invalidComposition";

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
  advancement: withDefaults(sectionSchemas.advancement, DEFAULT_RULES.advancement),
  tables: withDefaults(sectionSchemas.tables, DEFAULT_RULES.tables),
  system: withDefaults(sectionSchemas.system, DEFAULT_RULES.system),
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
    advancement: sections.advancement.prefault({}),
    tables: sections.tables.prefault({}),
    system: sections.system.prefault({}),
  })
  .refine((r) => initiativeOrdered(r.initiative), { message: INITIATIVE_ORDER_MESSAGE, path: ["initiative"] })
  .refine((r) => criticalsOrdered(r.criticals), { message: CRITICALS_ORDER_MESSAGE, path: ["criticals"] })
  .superRefine((r, ctx) => {
    for (const issue of validateComposition(r.system)) {
      if (issue.code !== "unknownKey") ctx.addIssue({ code: "custom", message: issue.code === "unknownModule" ? UNKNOWN_MODULE_MESSAGE : INVALID_COMPOSITION_MESSAGE, path: ["system", "modules"] });
    }
  });

const warnedModules = new Set<string>();

function warnDroppedModules(system: { key: string; modules?: readonly string[] }) {
  const id = `${system.key}:${(system.modules ?? []).join(",")}`;

  if (warnedModules.has(id)) return;

  warnedModules.add(id);
  console.warn(`rules.system.modules ignored: ${id}`);
}

export function parseRules(raw: unknown): Ruleset {
  const obj = isRecord(raw) ? raw : {};

  const rules = Object.fromEntries(Object.entries(ALL_SECTIONS).filter(([name]) => name !== "system").map(([name, section]) => [name, parseSection(section, obj[name])])) as Omit<Ruleset, "system">;

  const system = sectionSchemas.system.safeParse(obj.system);

  if (!system.success) return { ...rules, system: { key: rules.classes.enabled ? "dnd5e" : "homm" } };

  if (validateComposition(system.data).length === 0) return { ...rules, system: system.data };

  warnDroppedModules(system.data);

  return { ...rules, system: { key: system.data.key } };
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
    advancement: patchSection("advancement").optional(),
    tables: patchSection("tables").optional(),
    system: patchSection("system").omit({ modules: true }).optional(),
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

  if (isRecord(sections.tables)) next.tables = Object.fromEntries(Object.entries(next.tables).filter(([, rows]) => rows !== null));

  const groupPatch = sections.encounters?.unitGroups;

  if (isRecord(groupPatch)) {
    const unitGroups = { ...current.encounters.unitGroups };

    for (const [key, appearance] of Object.entries(groupPatch)) {
      if (isRecord(appearance)) unitGroups[key] = { ...unitGroups[key], ...appearance };
    }

    next.encounters = { ...next.encounters, unitGroups };
  }

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
