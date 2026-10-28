import { z } from "zod";

import { FEAT_TYPES } from "@/lib/constants/choices";
import { FeatChoicesSchema, FeatPrerequisiteSchema } from "@/lib/schemas/choices";
import { AbilitiesSchema } from "@/lib/utils/abilities/schema";

const featIconSchema = z.preprocess(
  (v) => (v === "" ? null : v),
  z.string().max(2000).refine((v) => !v.startsWith("data:"), "feats.validation.iconUrl").nullable().optional(),
);

const featFields = {
  name: z.string().trim().min(1).max(100),
  icon: featIconSchema,
  type: z.enum(FEAT_TYPES),
  prerequisite: FeatPrerequisiteSchema,
  repeatable: z.boolean(),
  description: z.string().max(8000).nullable(),
  abilities: AbilitiesSchema,
  choices: FeatChoicesSchema,
};

export const createFeatSchema = z.object({
  ...featFields,
  type: featFields.type.default("general"),
  prerequisite: featFields.prerequisite.prefault({}),
  repeatable: featFields.repeatable.default(false),
  description: featFields.description.optional(),
  abilities: featFields.abilities.describe("Feat abilities").default([]),
  choices: featFields.choices.describe("Nested feat choices (no feat kind)").default([]),
});

export const updateFeatSchema = z.object(featFields).partial();

export type CreateFeatInput = z.infer<typeof createFeatSchema>;

export type UpdateFeatInput = z.infer<typeof updateFeatSchema>;
