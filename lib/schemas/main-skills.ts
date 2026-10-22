import { z } from "zod";

import { MAIN_SKILL_NAME_MAX } from "@/lib/constants/main-skills";

const iconField = z
  .union([z.string().url(), z.literal(""), z.null()])
  .optional()
  .nullable()
  .transform((val) => (val === "" ? null : val));

export const createMainSkillSchema = z.object({
  name: z.string().min(1).max(MAIN_SKILL_NAME_MAX),
  color: z.string().min(1),
  icon: iconField,
  isEnableInSkillTree: z.boolean().optional(),
  spellGroupId: z.string().nullable().optional(),
});

export const updateMainSkillSchema = z.object({
  name: z.string().min(1).max(MAIN_SKILL_NAME_MAX).optional(),
  color: z.string().min(1).optional(),
  icon: iconField,
  isEnableInSkillTree: z.boolean().optional(),
  spellGroupId: z.string().nullable().optional(),
});
