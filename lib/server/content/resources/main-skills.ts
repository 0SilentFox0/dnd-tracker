import type { MainSkill as MainSkillRow } from "@prisma/client";
import type { z } from "zod";

import "server-only";
import { getCachedMainSkills } from "@/lib/cache/reference-data";
import { ReferenceKind } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { createMainSkillSchema, updateMainSkillSchema } from "@/lib/schemas";
import { assertCampaignRefs } from "@/lib/server/campaigns/campaign-refs";
import { defineResource } from "@/lib/server/content/define-resource";

export const mainSkillsResource = defineResource<MainSkillRow, z.infer<typeof createMainSkillSchema>, z.infer<typeof updateMainSkillSchema>>({
  kind: "main-skills",
  listFields: ["role", "spellGroupId"],
  idParam: "mainSkillId",
  label: "Main skills",
  description: "Progression branches (attack, magic, leadership…): role, colour, icon, school of magic.",
  path: "/main-skills",
  schemas: { create: createMainSkillSchema, update: updateMainSkillSchema },
  access: { list: "member", item: "dm" },
  invalidates: [ReferenceKind.MAIN_SKILLS, ReferenceKind.SKILLS],
  notFound: API_ERRORS.NOT_FOUND,
  list: (actor) => getCachedMainSkills(actor.campaignId),
  find: (actor, id) => prisma.mainSkill.findFirst({ where: { id, campaignId: actor.campaignId } }),
  async create(actor, data) {
    await assertCampaignRefs(actor.campaignId, { spellGroup: data.spellGroupId });

    return prisma.mainSkill.create({
      data: {
        campaignId: actor.campaignId,
        name: data.name,
        color: data.color,
        icon: data.icon || null,
        isEnableInSkillTree: data.isEnableInSkillTree ?? false,
        spellGroupId: data.spellGroupId || null,
        role: data.role ?? null,
      },
    });
  },
  async update(actor, existing, data) {
    await assertCampaignRefs(actor.campaignId, { spellGroup: data.spellGroupId });

    return prisma.mainSkill.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        color: data.color,
        icon: data.icon,
        isEnableInSkillTree: data.isEnableInSkillTree,
        spellGroupId: data.spellGroupId !== undefined ? data.spellGroupId || null : undefined,
        role: data.role,
      },
    });
  },
  async remove(actor, existing) {
    await prisma.mainSkill.deleteMany({ where: { id: existing.id, campaignId: actor.campaignId } });
  },
});
