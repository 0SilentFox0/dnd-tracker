import { z } from "zod";

import { ABILITY_KEYS } from "@/lib/constants/abilities";
import type { ErrorParams } from "@/lib/constants/api-errors";
import { CLASS_CASTERS, CLASS_COLUMN_KEY_RE, MAX_CLASS_COLUMNS, MAX_CLASS_LEVEL } from "@/lib/constants/classes";
import { DND_SKILLS } from "@/lib/constants/skills";
import { ClassChoicesSchema, PicksSchema } from "@/lib/schemas/choices";
import { columnRefIssues } from "@/lib/utils/abilities/class-columns";
import { AbilitiesSchema } from "@/lib/utils/abilities/schema";
import { choiceColumnIssues, classChoiceIdIssues } from "@/lib/utils/characters/choices/columns";
import { classColumnIssues } from "@/lib/utils/characters/classes/columns";

const classIconSchema = z.preprocess(
  (v) => (v === "" ? null : v),
  z.string().max(2000).refine((v) => !v.startsWith("data:"), "classes.validation.iconLink").nullable().optional(),
);

const classColorSchema = z.preprocess(
  (v) => (v === "" ? null : v),
  z.string().regex(/^#[0-9a-fA-F]{6}$/, "classes.validation.colorFormat").nullable().optional(),
);

const featureSchema = z.object({ level: z.number().int().min(1).max(MAX_CLASS_LEVEL), description: z.string().max(8000).optional(), abilities: AbilitiesSchema, choices: ClassChoicesSchema.optional() });

const subclassSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().trim().min(1).max(100),
  features: z.array(featureSchema).max(20).default([]),
});

export const ClassColumnSchema = z.object({
  key: z.string().regex(CLASS_COLUMN_KEY_RE, "classes.validation.columnKeyFormat").max(40),
  label: z.string().trim().min(1).max(60),
  values: z.array(z.string().trim().max(20)).length(MAX_CLASS_LEVEL),
  pool: z.object({ rest: z.enum(["short", "long"]) }).optional(),
});

const columnsSchema = z.array(ClassColumnSchema).max(MAX_CLASS_COLUMNS);

type TableIssue = { path: (string | number)[]; message: string; params?: ErrorParams };

const columnsIssues = (c: { columns?: z.infer<typeof ClassColumnSchema>[] }): TableIssue[] =>
  classColumnIssues(c.columns ?? []).map((issue) => ({ path: ["columns", ...issue.path], message: issue.message, params: issue.params }));

type FeatureLike = { abilities: Parameters<typeof columnRefIssues>[0]; choices?: Parameters<typeof choiceColumnIssues>[0] };

type TableInput = { columns?: z.infer<typeof ClassColumnSchema>[]; features?: FeatureLike[]; subclasses?: { features: FeatureLike[] }[] };

function refsIssues(c: TableInput): TableIssue[] {
  // оновлення без columns перевіряє ресурс за збереженою таблицею
  if (c.columns === undefined) return [];

  const columns = c.columns;

  const check = (features: FeatureLike[] | undefined, base: (string | number)[]) =>
    (features ?? []).flatMap((f, i) => [
      ...columnRefIssues(f.abilities, columns).map((issue) => ({ path: [...base, i, "abilities", ...issue.path], message: issue.message })),
      ...choiceColumnIssues(f.choices, columns).map((issue) => ({ path: [...base, i, "choices", ...issue.path], message: issue.message, params: issue.params })),
    ]);

  return [...check(c.features, ["features"]), ...(c.subclasses ?? []).flatMap((s, k) => check(s.features, ["subclasses", k, "features"]))];
}

const tableIssues = (c: TableInput): TableIssue[] => [...columnsIssues(c), ...refsIssues(c), ...classChoiceIdIssues(c.features, c.subclasses)];

const refineTable = (c: TableInput, ctx: z.RefinementCtx) => {
  for (const issue of tableIssues(c)) ctx.addIssue({ code: "custom", path: issue.path, message: issue.message, params: issue.params });
};

const profList = z.array(z.string().max(60)).max(20).default([]);

const multiclassProfs = z.object({ armor: profList, weapons: profList, skills: z.object({ count: z.number().int().min(0).max(18), from: profList }).optional() }).optional();

const hitDieSchema = z.union([z.literal(6), z.literal(8), z.literal(10), z.literal(12)]);

const casterSchema = z.enum(CLASS_CASTERS);

const abilityKeySchema = z.enum(ABILITY_KEYS);

const uniqueSubclassIds = (c: { subclasses?: Array<{ id: string }> }) => !c.subclasses || new Set(c.subclasses.map((s) => s.id)).size === c.subclasses.length;

const duplicateSubclass = { message: "classes.validation.duplicateSubclass", path: ["subclasses"] };

export const createClassSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    icon: classIconSchema,
    color: classColorSchema,
    hitDie: hitDieSchema.default(8),
    savingThrows: z.array(abilityKeySchema).max(6).default([]),
    proficiencies: z.object({ armor: profList, weapons: profList, tools: profList, multiclass: multiclassProfs }).prefault({}),
    skillChoices: z
      .object({ count: z.number().int().min(0).max(18).default(0), from: z.array(z.enum(DND_SKILLS)).default([]) })
      .prefault({}),
    caster: casterSchema.default("none"),
    spellcastingAbility: abilityKeySchema.nullable().default(null),
    features: z.array(featureSchema).max(40).default([]),
    subclassLevel: z.number().int().min(1).max(MAX_CLASS_LEVEL).nullable().default(null),
    subclasses: z.array(subclassSchema).max(20).default([]),
    columns: columnsSchema.default([]),
    spellList: z.string().trim().min(1).max(40).nullable().optional(),
  })
  .refine(uniqueSubclassIds, duplicateSubclass)
  .superRefine(refineTable);

export const updateClassSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    icon: classIconSchema,
    color: classColorSchema,
    hitDie: hitDieSchema.optional(),
    savingThrows: z.array(abilityKeySchema).max(6).optional(),
    proficiencies: z.object({ armor: profList, weapons: profList, tools: profList, multiclass: multiclassProfs }).optional(),
    skillChoices: z.object({ count: z.number().int().min(0).max(18).default(0), from: z.array(z.enum(DND_SKILLS)).default([]) }).optional(),
    caster: casterSchema.optional(),
    spellcastingAbility: abilityKeySchema.nullable().optional(),
    features: z.array(featureSchema).max(40).optional(),
    subclassLevel: z.number().int().min(1).max(MAX_CLASS_LEVEL).nullable().optional(),
    subclasses: z.array(subclassSchema).max(20).optional(),
    columns: columnsSchema.optional(),
    spellList: z.string().trim().min(1).max(40).nullable().optional(),
  })
  .refine(uniqueSubclassIds, duplicateSubclass)
  .superRefine(refineTable);

export const CharacterClassEntrySchema = z.object({
  classId: z.string().min(1),
  subclassId: z.string().min(1).nullable().optional(),
  level: z.number().int().min(1).max(MAX_CLASS_LEVEL),
  choices: PicksSchema.optional(),
});

export const CharacterClassesSchema = z
  .array(CharacterClassEntrySchema)
  .max(12)
  .refine((a) => new Set(a.map((x) => x.classId)).size === a.length, { message: "classes.validation.classRepeated" });

export type UpdateClassInput = z.infer<typeof updateClassSchema>;
