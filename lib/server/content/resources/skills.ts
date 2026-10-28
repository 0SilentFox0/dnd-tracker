import type { Skill as SkillRow } from "@prisma/client";

import "server-only";
import { ReferenceKind } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { listSkillsQuerySchema } from "@/lib/schemas";
import { type CreateSkillInput, createSkillSchema, type UpdateSkillInput, updateSkillSchema } from "@/lib/schemas";
import { assertCampaignRefs } from "@/lib/server/campaigns/campaign-refs";
import { defineResource } from "@/lib/server/content/define-resource";
import { parseInput } from "@/lib/server/content/errors";
import { buildSkillUpdateData } from "@/lib/server/skills/build-skill-update-data";
import { formatSkillResponse } from "@/lib/server/skills/format-skill-response";
import { readSkillsList } from "@/lib/server/skills/read-skills-list";
import { abilitiesJson } from "@/lib/utils/abilities/read";

const withRefs = { spell: true, spellGroup: true, grantedSpell: true } as const;

async function assertRefs(campaignId: string, data: { spellData?: { spellId?: string | null; grantedSpellId?: string | null; spellGroupId?: string | null }; mainSkillData?: { mainSkillId?: string | null } }) {
  await assertCampaignRefs(campaignId, {
    spell: [data.spellData?.spellId, data.spellData?.grantedSpellId],
    spellGroup: data.spellData?.spellGroupId,
    mainSkill: data.mainSkillData?.mainSkillId,
  });
}

export const skillsResource = defineResource<SkillRow, CreateSkillInput, UpdateSkillInput>({
  kind: "skills",
  idParam: "skillId",
  label: "Скіли",
  description: "Бібліотека скілів: опис, іконка, прив'язка до гілки й заклинань, здібності.",
  path: "/skills",
  schemas: { create: createSkillSchema, update: updateSkillSchema },
  access: { list: "member", item: "member" },
  invalidates: [ReferenceKind.SKILLS],
  notFound: API_ERRORS.SKILL_NOT_FOUND,
  async list(actor, query) {
    const { mainSkillId } = parseInput(listSkillsQuerySchema, Object.fromEntries(query), API_ERRORS.INVALID_QUERY);

    if (mainSkillId) {
      return prisma.skill.findMany({
        where: { campaignId: actor.campaignId, mainSkillId },
        select: { id: true, name: true, icon: true, description: true },
        orderBy: { createdAt: "desc" },
      });
    }

    return readSkillsList(actor.campaignId);
  },
  find: (actor, id, purpose) => prisma.skill.findFirst({ where: { id, campaignId: actor.campaignId }, ...(purpose === "read" && { include: withRefs }) }),
  toItem: (row) => formatSkillResponse(row),
  async create(actor, data) {
    await assertRefs(actor.campaignId, data);

    const { basicInfo, spellData, mainSkillData } = data;

    return prisma.skill.create({
      data: {
        campaignId: actor.campaignId,
        image: data.image ?? null,
        ...(data.abilities && { abilities: abilitiesJson(data.abilities) }),
        name: basicInfo.name,
        description: basicInfo.description || null,
        icon: basicInfo.icon || null,
        spellId: spellData.spellId || null,
        spellGroupId: spellData.spellGroupId || null,
        grantedSpellId: spellData.grantedSpellId || null,
        mainSkillId: mainSkillData.mainSkillId || null,
        spellNewSpellId: spellData.grantedSpellId || null,
      },
      include: withRefs,
    });
  },
  async update(actor, existing, data) {
    await assertRefs(actor.campaignId, data);

    const updated = await prisma.skill.update({ where: { id: existing.id }, data: buildSkillUpdateData(data), include: { ...withRefs, mainSkill: true } });

    return formatSkillResponse(updated);
  },
  async remove(actor, existing) {
    await prisma.skill.deleteMany({ where: { id: existing.id, campaignId: actor.campaignId } });
  },
  removeAll: async (actor) => (await prisma.skill.deleteMany({ where: { campaignId: actor.campaignId } })).count,
});
