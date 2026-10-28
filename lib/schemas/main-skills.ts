import { z } from "zod";

import { MAIN_SKILL_ROLES } from "@/lib/constants/main-skills";

const iconField = z
  .union([z.string().url(), z.literal(""), z.null()])
  .optional()
  .nullable()
  .transform((val) => (val === "" ? null : val));

export const createMainSkillSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().min(1),
  icon: iconField,
  isEnableInSkillTree: z.boolean().optional(),
  spellGroupId: z.string().nullable().optional(),
  role: z.enum(MAIN_SKILL_ROLES).nullable().optional(),
});

export const updateMainSkillSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().min(1).optional(),
  icon: iconField,
  isEnableInSkillTree: z.boolean().optional(),
  spellGroupId: z.string().nullable().optional(),
  role: z.enum(MAIN_SKILL_ROLES).nullable().optional(),
});
