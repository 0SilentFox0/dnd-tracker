import { z } from "zod";

import { ABILITY_KEYS } from "@/lib/constants/abilities";
import { CLASS_CASTERS, MAX_CLASS_LEVEL } from "@/lib/constants/classes";
import { DND_SKILLS } from "@/lib/constants/skills";
import { AbilitiesSchema } from "@/lib/utils/abilities/schema";

const classIconSchema = z.preprocess(
  (v) => (v === "" ? null : v),
  z.string().max(2000).refine((v) => !v.startsWith("data:"), "Іконка класу — лише посилання на зображення").nullable().optional(),
);

const classColorSchema = z.preprocess(
  (v) => (v === "" ? null : v),
  z.string().regex(/^#[0-9a-fA-F]{6}$/, "Колір класу — у форматі #RRGGBB").nullable().optional(),
);

const featureSchema = z.object({ level: z.number().int().min(1).max(MAX_CLASS_LEVEL), abilities: AbilitiesSchema });

const subclassSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().trim().min(1).max(100),
  features: z.array(featureSchema).max(20).default([]),
});

const profList = z.array(z.string().max(60)).max(20).default([]);

const hitDieSchema = z.union([z.literal(6), z.literal(8), z.literal(10), z.literal(12)]);

const casterSchema = z.enum(CLASS_CASTERS);

const abilityKeySchema = z.enum(ABILITY_KEYS);

const uniqueSubclassIds = (c: { subclasses?: Array<{ id: string }> }) => !c.subclasses || new Set(c.subclasses.map((s) => s.id)).size === c.subclasses.length;

const duplicateSubclass = { message: "Повторюваний id підкласу", path: ["subclasses"] };

export const createClassSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    icon: classIconSchema,
    color: classColorSchema,
    hitDie: hitDieSchema.default(8),
    savingThrows: z.array(abilityKeySchema).max(6).default([]),
    proficiencies: z.object({ armor: profList, weapons: profList, tools: profList }).prefault({}),
    skillChoices: z
      .object({ count: z.number().int().min(0).max(18).default(0), from: z.array(z.enum(DND_SKILLS)).default([]) })
      .prefault({}),
    caster: casterSchema.default("none"),
    spellcastingAbility: abilityKeySchema.nullable().default(null),
    features: z.array(featureSchema).max(40).default([]),
    subclassLevel: z.number().int().min(1).max(MAX_CLASS_LEVEL).nullable().default(null),
    subclasses: z.array(subclassSchema).max(20).default([]),
  })
  .refine(uniqueSubclassIds, duplicateSubclass);

export const updateClassSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    icon: classIconSchema,
    color: classColorSchema,
    hitDie: hitDieSchema.optional(),
    savingThrows: z.array(abilityKeySchema).max(6).optional(),
    proficiencies: z.object({ armor: profList, weapons: profList, tools: profList }).optional(),
    skillChoices: z.object({ count: z.number().int().min(0).max(18).default(0), from: z.array(z.enum(DND_SKILLS)).default([]) }).optional(),
    caster: casterSchema.optional(),
    spellcastingAbility: abilityKeySchema.nullable().optional(),
    features: z.array(featureSchema).max(40).optional(),
    subclassLevel: z.number().int().min(1).max(MAX_CLASS_LEVEL).nullable().optional(),
    subclasses: z.array(subclassSchema).max(20).optional(),
  })
  .refine(uniqueSubclassIds, duplicateSubclass);

export const CharacterClassEntrySchema = z.object({
  classId: z.string().min(1),
  subclassId: z.string().min(1).nullable().optional(),
  level: z.number().int().min(1).max(MAX_CLASS_LEVEL),
});

export const CharacterClassesSchema = z
  .array(CharacterClassEntrySchema)
  .max(12)
  .refine((a) => new Set(a.map((x) => x.classId)).size === a.length, { message: "Клас повторюється" });

export type UpdateClassInput = z.infer<typeof updateClassSchema>;
