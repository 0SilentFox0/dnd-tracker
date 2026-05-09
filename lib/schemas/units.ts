import { z } from "zod";

const unitAttackSchema = z.object({
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

const unitSpecialAbilitySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(["passive", "active"]),
  spellId: z.string().optional(),
  actionType: z.enum(["action", "bonus_action"]).optional(),
  effect: z.record(z.string(), z.unknown()).optional(),
});

export const createUnitSchema = z.object({
  name: z.string().min(1).max(100),
  race: z.string().optional(),
  groupId: z.string().optional(),
  level: z.number().min(1).max(30).default(1),
  damageModifier: z.string().optional(),
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
  attacks: z.array(unitAttackSchema).default([]),
  specialAbilities: z.array(unitSpecialAbilitySchema).default([]),
  immunities: z.array(z.string()).default([]),
  knownSpells: z.array(z.string()).default([]),
  morale: z.number().min(-3).max(3).default(0),
  avatar: z.string().optional(),
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;

export const updateUnitSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  race: z.string().optional().nullable(),
  groupId: z.string().optional().nullable(),
  damageModifier: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional(),
  ),
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
  specialAbilities: z.array(unitSpecialAbilitySchema).optional(),
  immunities: z.array(z.string()).optional(),
  knownSpells: z.array(z.string()).optional(),
  minTargets: z.number().min(1).optional(),
  maxTargets: z.number().min(1).optional(),
  morale: z.number().min(-3).max(3).optional(),
  avatar: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().url().nullable().optional(),
  ),
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
