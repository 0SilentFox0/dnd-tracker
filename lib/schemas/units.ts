import { z } from "zod";

import { ABILITY_KEYS } from "@/lib/constants/abilities";
import { AttackType, RECHARGE_THRESHOLDS } from "@/lib/constants/battle";
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
    .refine((v) => /^(https?:\/\/|\/)/i.test(v), "units.validation.avatarUrl")
    .nullable()
    .optional(),
);

const challengeSchema = z.number().refine(isChallengeRating, "units.validation.challengeRating").describe("5e challenge rating (0.125 = 1/8); null for an HOMM unit");

const monsterFields = {
  cr: challengeSchema.nullable().optional(),
  xp: z.number().int().min(0).max(1_000_000).nullable().optional().describe("XP awarded for the win; empty uses the CR table"),
};

const multiattack = z.number().int().min(1).max(10).describe("Attacks per Attack action (5e monster)");

const legendaryActions = z.number().int().min(0).max(5).describe("Legendary actions per round");

const legendaryResistances = z.number().int().min(0).max(10).describe("Legendary resistances per battle");

const saveProficiencies = z.array(z.enum(ABILITY_KEYS)).max(6).describe("Abilities with saving throw proficiency (5e)");

const distance = z.number().int().min(5).max(1000);

export const UnitStatblockSchema = z.object({
  creatureType: z.string().trim().min(1).max(40).optional(),
  size: z.enum(["tiny", "small", "medium", "large", "huge", "gargantuan"]).optional(),
  alignment: z.string().trim().max(80).optional(),
  senses: z.object({ darkvision: distance.optional(), blindsight: distance.optional(), tremorsense: distance.optional(), truesight: distance.optional(), passivePerception: z.number().int().min(1).max(40).optional() }).strict().optional(),
  movement: z.object({ fly: distance.optional(), swim: distance.optional(), climb: distance.optional(), burrow: distance.optional(), hover: z.boolean().optional() }).strict().optional(),
  languages: z.string().trim().max(300).optional(),
  telepathy: distance.optional(),
  lairResistances: z.number().int().min(0).max(10).optional(),
}).strict();

export const UnitSpellGrantSchema = z.object({
  spellId: z.string().min(1).max(100), perBattle: z.number().int().min(1).max(9).optional(), recharge: z.union([z.literal(RECHARGE_THRESHOLDS[0]), z.literal(RECHARGE_THRESHOLDS[1]), z.literal(RECHARGE_THRESHOLDS[2])]).optional(), castLevel: z.number().int().min(1).max(9).optional(), dc: z.number().int().min(5).max(30).optional(), attackBonus: z.number().int().min(-5).max(20).optional(), legendaryOnly: z.boolean().optional(),
}).strict().superRefine((v, ctx) => { if (v.recharge !== undefined && v.perBattle !== 1) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["perBattle"], message: "units.validation.rechargeNeedsPerBattle" }); });

export const UnitSpellcastingSchema = z.object({ ability: z.enum(ABILITY_KEYS).optional(), dc: z.number().int().min(5).max(30).optional(), attackBonus: z.number().int().min(-5).max(20).optional(), spells: z.array(UnitSpellGrantSchema).max(60).superRefine((spells, ctx) => {
  const seen = new Set<string>();

  spells.forEach((spell, index) => {
    if (seen.has(spell.spellId)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index, "spellId"], message: "units.validation.duplicateSpell" });

    seen.add(spell.spellId);
  });
}).default([]) }).strict();

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
  attacks: z.array(unitAttackSchema).describe("Unit attacks: name, bonus, damage dice, type").default([]),
  abilities: AbilitiesSchema.describe("Unit abilities").optional(),
  immunities: z.array(z.string()).default([]),
  knownSpells: z.array(z.string()).describe("Campaign spell ids the unit can cast").default([]),
  statblock: UnitStatblockSchema.default({}),
  spellcasting: UnitSpellcastingSchema.default({ spells: [] }),
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
  attacks: z.array(unitAttackSchema).describe("Unit attacks: name, bonus, damage dice, type").optional(),
  abilities: AbilitiesSchema.describe("Unit abilities").optional(),
  immunities: z.array(z.string()).optional(),
  knownSpells: z.array(z.string()).describe("Campaign spell ids the unit can cast").optional(),
  statblock: UnitStatblockSchema.optional(),
  spellcasting: UnitSpellcastingSchema.optional(),
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
  attacks: z.array(unitAttackSchema).describe("Unit attacks: name, bonus, damage dice, type").default([]),
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
  knownSpells: z.array(z.string()).describe("Campaign spell ids the unit can cast").default([]),
  statblock: UnitStatblockSchema.default({}),
  spellcasting: UnitSpellcastingSchema.default({ spells: [] }),
  avatar: unitAvatarSchema,
  ...monsterCreateFields,
});

export type ImportUnitRow = z.infer<typeof importUnitSchema>;

export const importUnitsSchema = z.object({ units: z.array(importUnitSchema) });
