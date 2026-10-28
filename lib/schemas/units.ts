import { z } from "zod";

import { ABILITY_KEYS } from "@/lib/constants/abilities";
import { AttackType } from "@/lib/constants/battle";
import { isChallengeRating } from "@/lib/constants/challenge";
import { WEAPON_TRAITS } from "@/lib/constants/weapon-traits";
import { AbilitiesSchema } from "@/lib/utils/abilities/schema";

export const unitAttackSchema = z.object({
  name: z.string(),
  type: z.enum([AttackType.MELEE, AttackType.RANGED]).optional(),
  targetType: z.enum(["target", "aoe"]).optional(),
  attackBonus: z.number(),
  damageType: z.string(),
  damageDice: z.string(),
  range: z.string().optional(),
  properties: z.string().optional(),
  maxTargets: z.number().min(1).max(20).optional(),
  damageDistribution: z.array(z.number().min(0).max(100)).optional(),
  guaranteedDamage: z.number().min(0).optional(),
  traits: z.array(z.enum(WEAPON_TRAITS)).max(7).optional(),
  versatileDice: z.string().trim().max(30).optional(),
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

const challengeSchema = z.number().refine(isChallengeRating, "CR: 0, 1/8, 1/4, 1/2 або ціле 1–30").describe("Рівень небезпеки 5e (0.125 = 1/8); null — юніт HOMM");

const monsterFields = {
  cr: challengeSchema.nullable().optional(),
  xp: z.number().int().min(0).max(1_000_000).nullable().optional().describe("XP за перемогу; порожньо — з таблиці CR"),
};

const multiattack = z.number().int().min(1).max(10).describe("Атак за дію «Атака» (монстр 5e)");

const legendaryActions = z.number().int().min(0).max(5).describe("Легендарних дій за раунд");

const legendaryResistances = z.number().int().min(0).max(10).describe("Легендарного опору за бій");

const saveProficiencies = z.array(z.enum(ABILITY_KEYS)).max(6).describe("Характеристики з майстерністю рятівних кидків (5e)");

const monsterCreateFields = {
  ...monsterFields,
  multiattack: multiattack.default(1),
  legendaryActions: legendaryActions.default(0),
  legendaryResistances: legendaryResistances.default(0),
  saveProficiencies: saveProficiencies.default([]),
};

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
  gridSize: z.number().int().min(1).max(3).default(1),
  maxHp: z.number().min(1).default(10),
  proficiencyBonus: z.number().min(0).optional(),
  minTargets: z.number().min(1).default(1),
  maxTargets: z.number().min(1).default(1),
  attacks: z.array(unitAttackSchema).describe("Атаки юніта: назва, бонус, кістки шкоди, тип").default([]),
  abilities: AbilitiesSchema.describe("Здібності юніта").optional(),
  immunities: z.array(z.string()).default([]),
  knownSpells: z.array(z.string()).describe("id заклинань кампанії, які юніт може кастувати").default([]),
  morale: z.number().min(-10).max(10).default(0),
  avatar: unitAvatarSchema,
  ...monsterCreateFields,
});

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
  gridSize: z.number().int().min(1).max(3).optional(),
  maxHp: z.number().min(1).optional(),
  proficiencyBonus: z.number().min(0).optional(),
  attacks: z.array(unitAttackSchema).describe("Атаки юніта: назва, бонус, кістки шкоди, тип").optional(),
  abilities: AbilitiesSchema.describe("Здібності юніта").optional(),
  immunities: z.array(z.string()).optional(),
  knownSpells: z.array(z.string()).describe("id заклинань кампанії, які юніт може кастувати").optional(),
  minTargets: z.number().min(1).optional(),
  maxTargets: z.number().min(1).optional(),
  morale: z.number().min(-10).max(10).optional(),
  avatar: unitAvatarSchema,
  ...monsterFields,
  multiattack: multiattack.optional(),
  legendaryActions: legendaryActions.optional(),
  legendaryResistances: legendaryResistances.optional(),
  saveProficiencies: saveProficiencies.optional(),
});

export const importUnitSchema = z.object({
  name: z.string().trim().min(1),
  raceName: z.string().trim().optional(),
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
  gridSize: z.number().int().min(1).max(3).default(1),
  maxHp: z.number().min(1).default(10),
  proficiencyBonus: z.number().min(0).optional(),
  attacks: z.array(unitAttackSchema).describe("Атаки юніта: назва, бонус, кістки шкоди, тип").default([]),
  specialAbilities: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        type: z.enum(["passive", "active"]),
        effect: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .default([]),
  knownSpells: z.array(z.string()).describe("id заклинань кампанії, які юніт може кастувати").default([]),
  avatar: unitAvatarSchema,
  ...monsterCreateFields,
});

export type ImportUnitRow = z.infer<typeof importUnitSchema>;

export const importUnitsSchema = z.object({ units: z.array(importUnitSchema) });
