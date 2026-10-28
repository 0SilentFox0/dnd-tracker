import { z } from "zod";

import { AbilitiesSchema } from "@/lib/utils/abilities/schema";

export const createSkillSchema = z.object({
  basicInfo: z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    icon: z.preprocess(
      (val) => (val === "" ? null : val),
      z.string().url().nullable().optional(),
    ),
  }),
  spellData: z.object({
    spellId: z.string().nullable().optional(),
    spellGroupId: z.string().nullable().optional(),
    grantedSpellId: z.string().nullable().optional(),
  }),
  abilities: AbilitiesSchema.describe("Здібності скіла").optional(),
  mainSkillData: z.object({
    mainSkillId: z.string().nullable().optional(),
  }),
  image: z.string().nullable().optional(),
});

export const updateSkillSchema = z.object({
  basicInfo: z
    .object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      icon: z.preprocess(
        (val) => (val === "" ? null : val),
        z.string().url().nullable().optional(),
      ),
    })
    .optional(),
  spellData: z
    .object({
      spellId: z.string().nullable().optional(),
      spellGroupId: z.string().nullable().optional(),
      grantedSpellId: z.string().nullable().optional(),
    })
    .optional(),
  abilities: AbilitiesSchema.describe("Здібності скіла").optional(),
  mainSkillData: z
    .object({
      mainSkillId: z.string().nullable().optional(),
    })
    .optional(),
  image: z.string().nullable().optional(),
  appearanceDescription: z.string().nullable().optional(),
});

export type CreateSkillInput = z.infer<typeof createSkillSchema>;
export type UpdateSkillInput = z.infer<typeof updateSkillSchema>;

export const saveSkillTreeSchema = z.object({
  race: z.string().min(1).describe("Назва раси, для якої це дерево"),
  skills: z
    .object({ mainSkills: z.array(z.object({ id: z.string() }).passthrough()).describe("Гілки дерева: id основного скіла і рівні з id скілів бібліотеки") })
    .passthrough(),
});
