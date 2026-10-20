import { NextResponse } from "next/server";

import { formatSkillsListResponse } from "./format-skills-response";

import { prisma } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

/** `GET …/skills` (full list); the DM skills page reuses it for the first HTML (`accessChecked` skips the repeated access query). */
export async function readSkills({ id, accessChecked = false }: { id: string; accessChecked?: boolean }): Promise<NextResponse> {
  try {
    if (!accessChecked) {
      const access = await requireCampaignAccess(id, false);

      if (access instanceof NextResponse) return access;
    }

    const skills = await prisma.skill.findMany({
      where: { campaignId: id },
      include: { spell: true, spellGroup: true, grantedSpell: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(formatSkillsListResponse(skills));
  } catch (error) {
    return handleApiError(error, { action: "list skills" });
  }
}
