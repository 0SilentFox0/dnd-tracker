import { z } from "zod";

import { DND_SKILLS } from "@/lib/constants/skills";
import { choicesSchemaFor } from "@/lib/schemas/choices";

const fields = {
  name: z.string().trim().min(1).max(100),
  icon: z.string().max(2000).refine((v) => !v.startsWith("data:"), "backgrounds.validation.iconUrl").nullable(),
  description: z.string().max(8000).nullable(),
  choices: choicesSchemaFor("background"),
  skillProficiencies: z.array(z.enum(DND_SKILLS)).max(DND_SKILLS.length),
  toolProficiencies: z.array(z.string().trim().min(1).max(100)).max(30),
  originFeatId: z.string().trim().min(1).max(100).nullable(),
  equipmentText: z.string().max(8000).nullable(),
};

export const createBackgroundSchema = z.object({
  ...fields,
  icon: fields.icon.optional(),
  description: fields.description.optional(),
  choices: fields.choices.default([]),
  skillProficiencies: fields.skillProficiencies.default([]),
  toolProficiencies: fields.toolProficiencies.default([]),
  originFeatId: fields.originFeatId.optional(),
  equipmentText: fields.equipmentText.optional(),
});

export const updateBackgroundSchema = z.object(fields).partial();
