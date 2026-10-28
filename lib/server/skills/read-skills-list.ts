import "server-only";
import { prisma } from "@/lib/db";
import { formatSkillsListResponse } from "@/lib/server/skills/format-skills-response";

export async function readSkillsList(campaignId: string) {
  const skills = await prisma.skill.findMany({
    where: { campaignId },
    include: { spell: true, spellGroup: true, grantedSpell: true },
    orderBy: { createdAt: "desc" },
  });

  return formatSkillsListResponse(skills);
}
