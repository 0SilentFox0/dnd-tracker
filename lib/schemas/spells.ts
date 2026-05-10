import { z } from "zod";

const abilityEnum = z.enum([
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
]);

const damageTypeEnum = z.enum(["damage", "heal", "all", "buff", "debuff"]);

const damageModifierEnum = z.enum([
  "control",
  "charm",
  "sleep",
  "state",
  "burning",
  "poison",
  "freezing",
]);

const healModifierEnum = z.enum([
  "heal",
  "regeneration",
  "dispel",
  "shield",
  "vampirism",
]);

const diceTypeEnum = z.enum(["d4", "d6", "d8", "d10", "d12", "d20", "d100"]);

const savingThrowSchema = z.object({
  ability: abilityEnum,
  onSuccess: z.enum(["half", "none"]),
  dc: z.number().min(1).max(30).optional().nullable(),
});

const hitCheckSchema = z.object({
  ability: abilityEnum,
  dc: z.number().min(1).max(30),
});

const nullableString = z.preprocess(
  (val) => (val === "" ? null : val),
  z.string().nullable().optional(),
);

export const createSpellSchema = z.object({
  name: z.string().min(1).max(100),
  level: z.number().min(0).max(9).default(0),
  type: z.enum(["target", "aoe"]),
  target: z.enum(["enemies", "allies", "all"]).optional(),
  damageType: damageTypeEnum,
  damageElement: nullableString,
  damageModifier: damageModifierEnum.optional().nullable(),
  healModifier: healModifierEnum.optional().nullable(),
  castingTime: z.string().optional().nullable(),
  range: z.string().optional().nullable(),
  duration: z.string().optional().nullable(),
  diceCount: z.number().min(0).max(10).optional().nullable(),
  diceType: diceTypeEnum.optional().nullable(),
  savingThrow: savingThrowSchema.optional().nullable(),
  description: z.string().optional().nullable(),
  effects: z.array(z.string()).optional().nullable(),
  groupId: z.string().optional().nullable(),
  icon: nullableString,
  summonUnitId: z.string().optional().nullable(),
  damageDistribution: z
    .array(z.number().min(0).max(100))
    .optional()
    .nullable(),
});

export type CreateSpellInput = z.infer<typeof createSpellSchema>;

export const updateSpellSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  level: z.number().min(0).max(9).optional(),
  type: z.enum(["target", "aoe"]).optional(),
  target: z.enum(["enemies", "allies", "all"]).optional().nullable(),
  damageType: damageTypeEnum.optional(),
  damageElement: nullableString,
  damageModifier: damageModifierEnum.optional().nullable(),
  healModifier: healModifierEnum.optional().nullable(),
  castingTime: z.string().optional().nullable(),
  range: z.string().optional().nullable(),
  duration: z.string().optional().nullable(),
  diceCount: z.number().min(0).max(10).optional().nullable(),
  diceType: diceTypeEnum.optional().nullable(),
  savingThrow: savingThrowSchema.optional().nullable(),
  hitCheck: hitCheckSchema.optional().nullable(),
  description: z.string().optional().nullable(),
  effects: z.array(z.string()).optional().nullable(),
  groupId: z.string().optional().nullable(),
  icon: nullableString,
  appearanceDescription: z.string().nullable().optional(),
  summonUnitId: z.string().nullable().optional(),
  damageDistribution: z
    .array(z.number().min(0).max(100))
    .nullable()
    .optional(),
});

export type UpdateSpellInput = z.infer<typeof updateSpellSchema>;

export const createSpellGroupSchema = z.object({
  name: z.string().min(1).max(100),
});

export type CreateSpellGroupInput = z.infer<typeof createSpellGroupSchema>;

export const updateSpellGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export type UpdateSpellGroupInput = z.infer<typeof updateSpellGroupSchema>;

export const deleteSpellsByLevelSchema = z.object({
  level: z.number().int().min(0).max(9),
});

export type DeleteSpellsByLevelInput = z.infer<
  typeof deleteSpellsByLevelSchema
>;
