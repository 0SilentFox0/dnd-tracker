import "server-only";
import { prisma } from "@/lib/db";
import { formatSkillsListResponse } from "@/lib/server/skills/format-skills-response";

const ID_NAME = { select: { id: true, name: true } } as const;

export async function readSkillsList(campaignId: string) {
  const skills = await prisma.skill.findMany({
    where: { campaignId },
    include: { spell: ID_NAME, spellGroup: ID_NAME, grantedSpell: ID_NAME },
    orderBy: { createdAt: "desc" },
  });

  return formatSkillsListResponse(skills);
}
