import { z } from "zod";

import { AbilitiesSchema } from "@/lib/utils/abilities/schema";

export const unitAttackSchema = z.object({
  name: z.string(),
  type: z.enum(["melee", "ranged"]).optional(),
  targetType: z.enum(["target", "aoe"]).optional(),
  attackBonus: z.number(),
  damageType: z.string(),
  damageDice: z.string(),
  range: z.string().optional(),
  properties: z.string().optional(),
  maxTargets: z.number().min(1).max(20).optional(),
  damageDistribution: z.array(z.number().min(0).max(100)).optional(),
  guaranteedDamage: z.number().min(0).optional(),
});

export const unitAvatarSchema = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z
    .string()
    .trim()
    .max(2000)
    .refine((v) => /^(https?:\/\/|\/)/i.test(v), "Аватар — посилання на зображення (http(s):// або /)")
    .nullable()
    .optional(),
);

export const createUnitSchema = z.object({
  name: z.string().trim().min(1).max(100),
  raceId: z.string().min(1).nullable().optional(),
  level: z.number().min(1).max(30).default(1),
  strength: z.number().min(1).max(30).default(10),
  dexterity: z.number().min(1).max(30).default(10),
  constitution: z.number().min(1).max(30).default(10),
  intelligence: z.number().min(1).max(30).default(10),
  wisdom: z.number().min(1).max(30).default(10),
  charisma: z.number().min(1).max(30).default(10),
  armorClass: z.number().min(0).default(10),
  initiative: z.number().default(0),
  speed: z.number().min(0).default(30),
  maxHp: z.number().min(1).default(10),
  proficiencyBonus: z.number().min(0).default(2),
  minTargets: z.number().min(1).default(1),
  maxTargets: z.number().min(1).default(1),
  attacks: z.array(unitAttackSchema).default([]),
  abilities: AbilitiesSchema.optional(),
  immunities: z.array(z.string()).default([]),
  knownSpells: z.array(z.string()).default([]),
  morale: z.number().min(-3).max(3).default(0),
  avatar: unitAvatarSchema,
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;

export const updateUnitSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  raceId: z.string().min(1).nullable().optional(),
  level: z.number().min(1).max(30).optional(),
  strength: z.number().min(1).max(30).optional(),
  dexterity: z.number().min(1).max(30).optional(),
  constitution: z.number().min(1).max(30).optional(),
  intelligence: z.number().min(1).max(30).optional(),
  wisdom: z.number().min(1).max(30).optional(),
  charisma: z.number().min(1).max(30).optional(),
  armorClass: z.number().min(0).optional(),
  initiative: z.number().optional(),
  speed: z.number().min(0).optional(),
  maxHp: z.number().min(1).optional(),
  proficiencyBonus: z.number().min(0).optional(),
  attacks: z.array(unitAttackSchema).optional(),
  abilities: AbilitiesSchema.optional(),
  immunities: z.array(z.string()).optional(),
  knownSpells: z.array(z.string()).optional(),
  minTargets: z.number().min(1).optional(),
  maxTargets: z.number().min(1).optional(),
  morale: z.number().min(-3).max(3).optional(),
  avatar: unitAvatarSchema,
});

export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;

export const createUnitGroupSchema = z.object({
  name: z.string().min(1).max(100),
  damageModifier: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional(),
  ),
});

export type CreateUnitGroupInput = z.infer<typeof createUnitGroupSchema>;

export const updateUnitGroupSchema = z.object({
  name: z.string().min(1).max(100),
  damageModifier: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional(),
  ),
});

export type UpdateUnitGroupInput = z.infer<typeof updateUnitGroupSchema>;

export const deleteUnitsByLevelSchema = z.object({
  level: z.number().int().min(1).max(30),
});

export type DeleteUnitsByLevelInput = z.infer<typeof deleteUnitsByLevelSchema>;
