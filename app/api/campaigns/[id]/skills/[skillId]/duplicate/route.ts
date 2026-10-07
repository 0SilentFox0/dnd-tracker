import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { abilitiesJson, skillAbilities } from "@/lib/utils/abilities/read";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";

/**
 * POST /api/campaigns/[id]/skills/[skillId]/duplicate
 * Створює копію скіла з новим id (назва + " (копія)")
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; skillId: string }> },
) {
  try {
    const { id, skillId } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) return accessResult;

    const source = await prisma.skill.findUnique({
      where: { id: skillId },
    });

    if (!source || source.campaignId !== id) {
      return errorResponse(API_ERRORS.SKILL_NOT_FOUND, 404);
    }

    const name = source.name.trim() ? `${source.name} (копія)` : "Скіл (копія)";

    const skill = await prisma.skill.create({
      data: {
        campaignId: id,
        name,
        description: source.description,
        icon: source.icon,
        image: source.image ?? null,
        spellId: source.spellId,
        spellGroupId: source.spellGroupId,
        grantedSpellId: source.grantedSpellId,
        mainSkillId: source.mainSkillId,
        spellEnhancementData: (source.spellEnhancementData as Prisma.InputJsonValue) ?? {},
        spellEnhancementTypes: Array.isArray(source.spellEnhancementTypes)
          ? (source.spellEnhancementTypes as Prisma.InputJsonValue)
          : [],
        spellEffectIncrease: source.spellEffectIncrease ?? null,
        spellTargetChange: source.spellTargetChange
          ? (source.spellTargetChange as Prisma.InputJsonValue)
          : undefined,
        spellAdditionalModifier: source.spellAdditionalModifier
          ? (source.spellAdditionalModifier as Prisma.InputJsonValue)
          : undefined,
        spellNewSpellId: source.spellNewSpellId ?? null,
        abilities: abilitiesJson(skillAbilities(source)),
      },
      include: {
        spell: true,
        spellGroup: true,
        grantedSpell: true,
        mainSkill: true,
      },
    });

    invalidateReference(ReferenceKind.SKILLS, id);

    return NextResponse.json(skill);
  } catch (error) {
    return handleApiError(error, { action: "duplicate skill" });
  }
}
