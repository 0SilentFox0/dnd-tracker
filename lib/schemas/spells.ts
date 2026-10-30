import { z } from "zod";

import { SPELL_GROUP_ICON_KEYS } from "@/lib/constants/spell-groups";
import { SPELL_NAME_MAX } from "@/lib/constants/spells";
import { SpellListsSchema } from "@/lib/schemas/choices";
import { hexColorSchema } from "@/lib/schemas/common";
import { SpellFxSchema } from "@/lib/utils/battle/fx/spell-fx-schema";
import { RaceModifierSchema, SpellCastingTimeSchema, SpellCostSchema, SpellDiceSchema, SpellDieSidesSchema, SpellEffectSchema, SpellResolutionSchema, SpellTargetingSchema } from "@/lib/utils/spells/model/schema";

const nullableString = z.preprocess((val) => (val === "" ? null : val), z.string().nullable().optional());

const spellFields = {
  executionMode: z.enum(["native", "manual"]).optional(),
  name: z.string().min(1).max(SPELL_NAME_MAX),
  level: z.number().int().min(0).max(9),
  groupId: z.string().nullable(),
  icon: nullableString,
  description: z.string().nullable(),
  appearanceDescription: z.string().nullable(),
  cost: SpellCostSchema,
  casting: SpellCastingTimeSchema.nullable().optional(),
  dice: SpellDiceSchema,
  targeting: SpellTargetingSchema,
  resolution: SpellResolutionSchema,
  spellEffects: z.array(SpellEffectSchema),
  raceModifiers: z.array(RaceModifierSchema),
  stackable: z.boolean(),
  maxStacks: z.number().int().min(1).max(10).nullable(),
  concentration: z.boolean(),
  ritual: z.boolean(),
  dieSides: SpellDieSidesSchema.nullable(),
  upcastDice: z.number().int().min(0).max(10).nullable(),
  upcastTargets: z.number().int().min(0).max(10).nullable(),
  addAbilityMod: z.boolean().nullable(),
  fixedDice: z.boolean().nullable(),
  damageBonus: z.number().int().min(-20).max(40).nullable(),
  fx: SpellFxSchema.describe("Visual effect of the spell on the battle map").nullable().optional(),
  lists: SpellListsSchema.describe("Class spell-list tags (Wizard, Cleric…)"),
};

export const createSpellSchema = z.object({
  ...spellFields,
  level: z.number().int().min(0).max(9).default(1),
  groupId: spellFields.groupId.optional(),
  description: spellFields.description.optional(),
  appearanceDescription: spellFields.appearanceDescription.optional(),
  cost: spellFields.cost.default("action"),
  dice: spellFields.dice.default(0),
  targeting: spellFields.targeting.default({ kind: "enemy" }),
  resolution: spellFields.resolution.default({ kind: "auto" }),
  spellEffects: spellFields.spellEffects.default([]),
  raceModifiers: spellFields.raceModifiers.default([]),
  stackable: spellFields.stackable.default(false),
  maxStacks: spellFields.maxStacks.optional(),
  concentration: spellFields.concentration.default(false),
  ritual: spellFields.ritual.default(false),
  dieSides: spellFields.dieSides.optional(),
  upcastDice: spellFields.upcastDice.optional(),
  upcastTargets: spellFields.upcastTargets.optional(),
  addAbilityMod: spellFields.addAbilityMod.optional(),
  fixedDice: spellFields.fixedDice.optional(),
  damageBonus: spellFields.damageBonus.optional(),
  lists: spellFields.lists.optional(),
});

export type CreateSpellInput = z.infer<typeof createSpellSchema>;

export const updateSpellSchema = z.object(spellFields).partial();

export type UpdateSpellInput = z.infer<typeof updateSpellSchema>;

export const createSpellGroupSchema = z.object({
  name: z.string().min(1).max(SPELL_NAME_MAX),
  color: hexColorSchema().nullable().optional(),
  icon: z.enum(SPELL_GROUP_ICON_KEYS).nullable().optional(),
});

export const updateSpellGroupSchema = z.object({
  name: z.string().min(1).max(SPELL_NAME_MAX).optional(),
  color: hexColorSchema().nullable().optional(),
  icon: z.enum(SPELL_GROUP_ICON_KEYS).nullable().optional(),
});

export const deleteSpellsByLevelSchema = z.object({
  level: z.number().int().min(0).max(9),
});
