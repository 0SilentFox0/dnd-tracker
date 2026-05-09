import { z } from "zod";

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
});

export type CreateMainSkillInput = z.infer<typeof createMainSkillSchema>;

export const updateMainSkillSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().min(1).optional(),
  icon: iconField,
  isEnableInSkillTree: z.boolean().optional(),
  spellGroupId: z.string().nullable().optional(),
});

export type UpdateMainSkillInput = z.infer<typeof updateMainSkillSchema>;
