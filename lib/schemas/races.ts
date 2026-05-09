import { z } from "zod";

const passiveAbilitySchema = z
  .object({
    description: z.string(),
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

export const createRaceSchema = z.object({
  name: z.string().min(1).max(100),
  availableSkills: z.array(z.string()).default([]),
  disabledSkills: z.array(z.string()).default([]),
  passiveAbility: passiveAbilitySchema,
  spellSlotProgression: spellSlotProgressionSchema,
});

export type CreateRaceInput = z.infer<typeof createRaceSchema>;

export const updateRaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  availableSkills: z.array(z.string()).optional(),
  disabledSkills: z.array(z.string()).optional(),
  passiveAbility: passiveAbilitySchema,
  spellSlotProgression: spellSlotProgressionSchema,
});

export type UpdateRaceInput = z.infer<typeof updateRaceSchema>;
