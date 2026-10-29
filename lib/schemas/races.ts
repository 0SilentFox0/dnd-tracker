import { z } from "zod";

import { RaceChoicesSchema } from "@/lib/schemas/choices";
import { AbilitiesSchema } from "@/lib/utils/abilities/schema";

const passiveAbilitySchema = z
  .object({
    creatureType: z.string().trim().min(1).max(60).optional(),
    name: z.string().optional(),
    icon: z.string().max(2000).optional(),
    description: z.string(),
    appearanceDescription: z.string().optional(),
    statImprovements: z.string().optional(),
    statModifiers: z
      .record(
        z.string(),
        z.object({
          bonus: z.boolean().optional(),
          nonNegative: z.boolean().optional(),
          alwaysZero: z.boolean().optional(),
        }),
      )
      .optional(),
  })
  .optional();

const spellSlotProgressionSchema = z
  .array(
    z.object({
      level: z.number().min(1).max(5),
      slots: z.number().min(0),
    }),
  )
  .optional();

const raceIconSchema = z.preprocess(
  (v) => (v === "" ? null : v),
  z.string().max(2000).refine((v) => !v.startsWith("data:"), "races.validation.iconUrl").nullable().optional(),
);

const raceColorSchema = z.preprocess(
  (v) => (v === "" ? null : v),
  z.string().regex(/^#[0-9a-fA-F]{6}$/, "races.validation.color").nullable().optional(),
);

export const createRaceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  icon: raceIconSchema,
  color: raceColorSchema,
  availableSkills: z.array(z.string()).default([]),
  disabledSkills: z.array(z.string()).default([]),
  passiveAbility: passiveAbilitySchema,
  abilities: AbilitiesSchema.describe("Race abilities").optional(),
  choices: RaceChoicesSchema.describe("Race choices: lineage, skills, feats, options; an option spellId is a spell id").optional(),
  spellSlotProgression: spellSlotProgressionSchema,
});

export const updateRaceSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  icon: raceIconSchema,
  color: raceColorSchema,
  availableSkills: z.array(z.string()).optional(),
  disabledSkills: z.array(z.string()).optional(),
  passiveAbility: passiveAbilitySchema,
  abilities: AbilitiesSchema.describe("Race abilities").optional(),
  choices: RaceChoicesSchema.describe("Race choices: lineage, skills, feats, options; an option spellId is a spell id").optional(),
  spellSlotProgression: spellSlotProgressionSchema,
});

export type UpdateRaceInput = z.infer<typeof updateRaceSchema>;
