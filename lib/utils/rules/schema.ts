import { z } from "zod";

import { DEFAULT_RULES } from "./defaults";

const level = z.string().regex(/^([1-9]|1\d|20)$/);

const DiceTable = z.record(level, z.string().regex(/^\d+d\d+([+-]\d+d\d+)*$/));

const INITIATIVE_ORDER_MESSAGE = "Мінімум ініціативи більший за максимум";

const CRITICALS_ORDER_MESSAGE = "Фумбл має бути нижчим за крит";

const sections = {
  morale: z.strictObject({ enabled: z.boolean().default(true), cap: z.number().int().min(1).max(10).default(3) }),
  criticals: z.strictObject({
    critOn: z.number().int().min(2).max(20).default(20),
    fumbleOn: z.number().int().min(0).max(5).default(1),
    effects: z.boolean().default(true),
    disabledSuccess: z.array(z.string()).default([]),
    disabledFail: z.array(z.string()).default([]),
  }),
  formulas: z.strictObject({
    saveDcBase: z.number().int().min(0).max(20).default(8),
    proficiencyBase: z.number().int().min(0).max(10).default(2),
    proficiencyEvery: z.number().int().min(1).max(20).default(4),
  }),
  heroScaling: z.strictObject({
    meleeDiceByLevel: DiceTable.nullable().default(null),
    rangedDiceByLevel: DiceTable.nullable().default(null),
    hpBaseLevels: z.number().int().min(0).max(10).default(3),
    hpConCoefficient: z.number().min(0).max(5).default(1.5),
  }),
  initiative: z.strictObject({
    heroMin: z.number().int().min(0).max(50).default(10),
    heroMax: z.number().int().min(0).max(50).default(16),
  }),
  defaultAttacks: z.strictObject({
    meleeName: z.string().trim().min(1).max(60).default("Звичайний удар"),
    rangedName: z.string().trim().min(1).max(60).default("Звичайний постріл"),
  }),
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
  })
  .refine((r) => initiativeOrdered(r.initiative), { message: INITIATIVE_ORDER_MESSAGE, path: ["initiative"] })
  .refine((r) => criticalsOrdered(r.criticals), { message: CRITICALS_ORDER_MESSAGE, path: ["criticals"] });

export type Ruleset = z.infer<typeof RulesetSchema>;

export function parseRules(raw: unknown): Ruleset {
  const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};

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

export const RulesetPatchSchema = z
  .strictObject({
    morale: patchSection("morale").optional(),
    criticals: patchSection("criticals").optional(),
    formulas: patchSection("formulas").optional(),
    heroScaling: patchSection("heroScaling").optional(),
    initiative: patchSection("initiative").optional(),
    defaultAttacks: patchSection("defaultAttacks").optional(),
  })
  .refine((p) => !p.initiative || initiativeOrdered(p.initiative), { message: INITIATIVE_ORDER_MESSAGE, path: ["initiative"] });

export type MergeRulesResult = { ok: true; rules: Ruleset } | { ok: false; issues: z.core.$ZodIssue[] };

export function mergeRules(current: Ruleset, patch: Record<string, Record<string, unknown> | undefined>): MergeRulesResult {
  const next = Object.fromEntries((Object.keys(current) as (keyof Ruleset)[]).map((k) => [k, { ...current[k], ...(patch[k] ?? {}) }]));

  const parsed = RulesetSchema.safeParse(next);

  return parsed.success ? { ok: true, rules: parsed.data } : { ok: false, issues: parsed.error.issues };
}

export type RulesetPatch = z.infer<typeof RulesetPatchSchema>;
