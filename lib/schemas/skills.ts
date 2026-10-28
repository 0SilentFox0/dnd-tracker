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

const treeSlotSchema = z.object({ id: z.string().describe("id скіла з бібліотеки (content_list kind: skills)") }).passthrough();

const circlesSchema = z
  .object({
    circle1: z.array(treeSlotSchema).optional().describe("Внутрішнє коло (1 слот)"),
    circle2: z.array(treeSlotSchema).optional().describe("Середнє коло (до 2 слотів)"),
    circle3: z.array(treeSlotSchema).optional().describe("Зовнішнє коло (до 3 слотів)"),
  })
  .passthrough();

const levelIdsSchema = z.object({ basic: z.string().nullish(), advanced: z.string().nullish(), expert: z.string().nullish() }).passthrough();

const treeBranchSchema = z
  .object({
    id: z.string().describe('id основного скіла (content_list kind: main-skills) або "racial" для расової гілки'),
    name: z.string().nullish().describe("Назва гілки"),
    color: z.string().nullish().describe("Колір гілки (CSS-назва або hex)"),
    icon: z.string().nullish(),
    spellGroupId: z.string().nullish(),
    levelSkillIds: levelIdsSchema.optional().describe("id скіла для рівнів гілки: basic (Основи), advanced (Просунутий), expert (Експерт)"),
    levels: z
      .object({ basic: circlesSchema.optional(), advanced: circlesSchema.optional(), expert: circlesSchema.optional() })
      .passthrough()
      .optional()
      .describe("Слоти кіл за рівнями гілки; для расової гілки (id racial) — {}"),
  })
  .passthrough();

export const saveSkillTreeSchema = z.object({
  race: z.string().min(1).describe("Назва раси, для якої це дерево"),
  skills: z
    .object({
      mainSkills: z.array(treeBranchSchema).min(1).describe('Гілки дерева: по одній на основний скіл + расова гілка з id "racial"'),
      ultimateSkill: treeSlotSchema.nullish().describe("Вершина дерева: id скіла або null"),
    })
    .passthrough()
    .describe("Дерево скілів раси"),
});
