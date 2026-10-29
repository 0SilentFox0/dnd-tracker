import { z } from "zod";

import { MAIN_SKILL_NAME_MAX, MAIN_SKILL_ROLES } from "@/lib/constants/main-skills";
import { urlField } from "@/lib/schemas/common";

const iconField = z
  .union([urlField(), z.literal(""), z.null()])
  .optional()
  .nullable()
  .transform((val) => (val === "" ? null : val));

export const createMainSkillSchema = z.object({
  name: z.string().min(1).max(MAIN_SKILL_NAME_MAX),
  color: z.string().min(1),
  icon: iconField,
  isEnableInSkillTree: z.boolean().optional(),
  spellGroupId: z.string().nullable().optional(),
  role: z.enum(MAIN_SKILL_ROLES).nullable().optional(),
});

export const updateMainSkillSchema = z.object({
  name: z.string().min(1).max(MAIN_SKILL_NAME_MAX).optional(),
  color: z.string().min(1).optional(),
  icon: iconField,
  isEnableInSkillTree: z.boolean().optional(),
  spellGroupId: z.string().nullable().optional(),
  role: z.enum(MAIN_SKILL_ROLES).nullable().optional(),
});
