import { z } from "zod";

import { EffectSchema } from "@/lib/utils/abilities/schema";
import { RaceModifierSchema, SpellCostSchema, SpellDiceSchema, SpellResolutionSchema, SpellTargetingSchema } from "@/lib/utils/spells/model/schema";

const nullableString = z.preprocess((val) => (val === "" ? null : val), z.string().nullable().optional());

const spellFields = {
  name: z.string().min(1).max(100),
  level: z.number().int().min(0).max(5),
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
};

export const createSpellSchema = z.object({
  ...spellFields,
  level: z.number().int().min(1).max(5).default(1),
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
});

export type CreateSpellInput = z.infer<typeof createSpellSchema>;

export const updateSpellSchema = z.object(spellFields).partial();

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
