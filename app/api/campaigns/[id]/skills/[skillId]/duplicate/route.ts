import { NextResponse } from "next/server";

import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { abilitiesJson, skillAbilities } from "@/lib/utils/abilities/read";
import { errorResponse } from "@/lib/utils/api/api-response";
import { operationRoute } from "@/lib/utils/api/content-routes";

export const POST = operationRoute(CONTENT_OPERATIONS["skills.duplicate"], async ({ actor, params: p }) => {
  const source = await prisma.skill.findUnique({ where: { id: p.skillId } });

  if (!source || source.campaignId !== actor.campaignId) {
    return errorResponse(API_ERRORS.SKILL_NOT_FOUND, 404);
  }

  const name = source.name.trim() ? `${source.name} (копія)` : "Скіл (копія)";

  const skill = await prisma.skill.create({
    data: {
      campaignId: actor.campaignId,
      name,
      description: source.description,
      icon: source.icon,
      image: source.image ?? null,
      spellId: source.spellId,
      spellGroupId: source.spellGroupId,
      grantedSpellId: source.grantedSpellId,
      mainSkillId: source.mainSkillId,
      spellNewSpellId: source.grantedSpellId,
      abilities: abilitiesJson(skillAbilities(source)),
    },
    include: {
      spell: true,
      spellGroup: true,
      grantedSpell: true,
      mainSkill: true,
    },
  });

  invalidateReference(ReferenceKind.SKILLS, actor.campaignId);

  return NextResponse.json(skill);
});
