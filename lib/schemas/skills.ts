import { z } from "zod";

import { SKILL_NAME_MAX } from "@/lib/constants/skills";
import { AbilitiesSchema } from "@/lib/utils/abilities/schema";

export const createSkillSchema = z.object({
  basicInfo: z.object({
    name: z.string().min(1).max(SKILL_NAME_MAX),
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
  abilities: AbilitiesSchema.describe("Skill abilities").optional(),
  mainSkillData: z.object({
    mainSkillId: z.string().nullable().optional(),
  }),
  image: z.string().nullable().optional(),
});

export const updateSkillSchema = z.object({
  basicInfo: z
    .object({
      name: z.string().min(1).max(SKILL_NAME_MAX).optional(),
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
  abilities: AbilitiesSchema.describe("Skill abilities").optional(),
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

const treeSlotSchema = z.object({ id: z.string().describe("id of a skill from the library (content_list kind: skills)") }).passthrough();

const circlesSchema = z
  .object({
    circle1: z.array(treeSlotSchema).optional().describe("Inner circle (1 slot)"),
    circle2: z.array(treeSlotSchema).optional().describe("Middle circle (up to 2 slots)"),
    circle3: z.array(treeSlotSchema).optional().describe("Outer circle (up to 3 slots)"),
  })
  .passthrough();

const levelIdsSchema = z.object({ basic: z.string().nullish(), advanced: z.string().nullish(), expert: z.string().nullish() }).passthrough();

const treeBranchSchema = z
  .object({
    id: z.string().describe('id of a main skill (content_list kind: main-skills) or "racial" for the racial branch'),
    name: z.string().nullish().describe("Branch name"),
    color: z.string().nullish().describe("Branch color (CSS name or hex)"),
    icon: z.string().nullish(),
    spellGroupId: z.string().nullish(),
    levelSkillIds: levelIdsSchema.optional().describe("skill ids for the branch levels: basic, advanced, expert"),
    levels: z
      .object({ basic: circlesSchema.optional(), advanced: circlesSchema.optional(), expert: circlesSchema.optional() })
      .passthrough()
      .optional()
      .describe("Circle slots per branch level; for the racial branch (id racial) — {}"),
  })
  .passthrough();

export const saveSkillTreeSchema = z.object({
  race: z.string().min(1).describe("Name of the race this tree is for"),
  skills: z
    .object({
      mainSkills: z.array(treeBranchSchema).min(1).describe('Tree branches: one per main skill plus the racial branch with id "racial"'),
      ultimateSkill: treeSlotSchema.nullish().describe("Tree top: skill id or null"),
    })
    .passthrough()
    .describe("Race skill tree"),
});
