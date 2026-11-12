import { z } from "zod";

import { RULES_EDITIONS } from "@/lib/constants/rules";
import { UnitGroupAppearancesSchema } from "@/lib/schemas/unit-groups";
import { StaticEffectSchema } from "@/lib/utils/abilities/schema/effects";
import { CONDITION_KEYS, CUSTOM_CONDITION_KEY_RE } from "@/lib/utils/abilities/schema/kinds";
import { RULE_SYSTEM_KEYS } from "@/lib/utils/rules/systems/meta";
import { AdvancementRulesSchema } from "@/systems/wfrp/rules/advancement/schema";
import { TablesRulesSchema } from "@/systems/wfrp/rules/tables/schema";

const level = z.string().regex(/^([1-9]|1\d|20)$/);

const DiceTable = z.record(level, z.string().regex(/^\d+d\d+([+-]\d+d\d+)*$/));

export const INITIATIVE_ORDER_MESSAGE = "rules.validation.initiativeOrder";

export const CRITICALS_ORDER_MESSAGE = "rules.validation.criticalsOrder";

export const UNKNOWN_SYSTEM_MESSAGE = "rules.validation.unknownSystem";

const CustomConditionSchema = z.object({
  key: z.string().regex(CUSTOM_CONDITION_KEY_RE),
  name: z.string().min(1).max(60),
  description: z.string().max(2000),
  markers: z.array(z.enum(CONDITION_KEYS)).max(10),
  abilityEffects: z.array(StaticEffectSchema).max(10).optional(),
});

export const sectionSchemas = {
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
    weaponName: z.string().trim().min(1).max(60),
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
    unitGroups: UnitGroupAppearancesSchema.optional(),
    edition: z.enum(RULES_EDITIONS),
    autoXp: z.boolean(),
  }),
  items: z.strictObject({ enabled: z.boolean(), attunementLimit: z.number().int().min(1).max(10) }),
  spellIngredients: z.strictObject({ enabled: z.boolean(), autoPay: z.boolean() }),
  advancement: AdvancementRulesSchema,
  tables: TablesRulesSchema,
  system: z.strictObject({
    key: z.enum(RULE_SYSTEM_KEYS as [string, ...string[]], { message: UNKNOWN_SYSTEM_MESSAGE }),
    modules: z.array(z.string()).transform((ids) => [...new Set(ids)].sort()).optional(),
  }),
};

export type Ruleset = { [K in keyof typeof sectionSchemas]: z.output<(typeof sectionSchemas)[K]> };
