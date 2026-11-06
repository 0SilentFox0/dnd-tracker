import "server-only";
import { prisma } from "@/lib/db";
import { parseProfile } from "@/lib/utils/rules/systems/schemas";

export async function profileReferences(campaignId: string, ref: { careerId?: string; featId?: string }): Promise<boolean> {
  const rows = await prisma.raceProfile.findMany({ where: { campaignId }, select: { profile: true } });

  return rows.some(({ profile }) => {
    const p = parseProfile(profile);

    return (ref.careerId !== undefined && p.careerTable.some((r) => r.careerId === ref.careerId))
      || (ref.featId !== undefined && (p.talents.includes(ref.featId) || p.randomTalents.some((r) => r.featId === ref.featId)));
  });
}
