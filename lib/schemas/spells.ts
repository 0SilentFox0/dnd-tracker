import { z } from "zod";

import { SPELL_GROUP_ICON_KEYS } from "@/lib/constants/spell-groups";
import { EffectSchema } from "@/lib/utils/abilities/schema";
import { SpellFxSchema } from "@/lib/utils/battle/fx/spell-fx-schema";
import { RaceModifierSchema, SpellCostSchema, SpellDiceSchema, SpellDieSidesSchema, SpellResolutionSchema, SpellTargetingSchema } from "@/lib/utils/spells/model/schema";

const nullableString = z.preprocess((val) => (val === "" ? null : val), z.string().nullable().optional());

const spellFields = {
  name: z.string().min(1).max(100),
  level: z.number().int().min(0).max(9),
  groupId: z.string().nullable(),
  icon: nullableString,
  description: z.string().nullable(),
  appearanceDescription: z.string().nullable(),
  cost: SpellCostSchema,
  dice: SpellDiceSchema,
  targeting: SpellTargetingSchema,
  resolution: SpellResolutionSchema,
  spellEffects: z.array(EffectSchema),
  raceModifiers: z.array(RaceModifierSchema),
  stackable: z.boolean(),
  maxStacks: z.number().int().min(1).max(10).nullable(),
  concentration: z.boolean(),
  dieSides: SpellDieSidesSchema.nullable(),
  upcastDice: z.number().int().min(0).max(10).nullable(),
  upcastTargets: z.number().int().min(0).max(10).nullable(),
  addAbilityMod: z.boolean().nullable(),
  fx: SpellFxSchema.describe("Візуальний ефект заклинання на мапі бою").nullable().optional(),
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
  dieSides: spellFields.dieSides.optional(),
  upcastDice: spellFields.upcastDice.optional(),
  upcastTargets: spellFields.upcastTargets.optional(),
  addAbilityMod: spellFields.addAbilityMod.optional(),
});

export type CreateSpellInput = z.infer<typeof createSpellSchema>;

export const updateSpellSchema = z.object(spellFields).partial();

export type UpdateSpellInput = z.infer<typeof updateSpellSchema>;

export const createSpellGroupSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).nullable().optional(),
  icon: z.enum(SPELL_GROUP_ICON_KEYS).nullable().optional(),
});

export const updateSpellGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).nullable().optional(),
  icon: z.enum(SPELL_GROUP_ICON_KEYS).nullable().optional(),
});

export const deleteSpellsByLevelSchema = z.object({
  level: z.number().int().min(0).max(9),
});
