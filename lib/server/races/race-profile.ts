import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { assertCampaignRefs } from "@/lib/server/campaigns/campaign-refs";
import { ContentError } from "@/lib/server/content/errors";
import type { SpeciesProfile } from "@/lib/utils/rules/systems";
import { SpeciesProfileSchema } from "@/lib/utils/rules/systems/schemas";

export type RaceProfileItem = { raceId: string; profile: SpeciesProfile };

export async function listRaceProfiles(campaignId: string): Promise<RaceProfileItem[]> {
  const rows = await prisma.raceProfile.findMany({ where: { campaignId }, select: { raceId: true, profile: true } });

  return rows.flatMap(({ raceId, profile }) => {
    const parsed = SpeciesProfileSchema.safeParse(profile);

    return parsed.success ? [{ raceId, profile: parsed.data as SpeciesProfile }] : [];
  });
}

export async function saveRaceProfile(campaignId: string, raceId: string, profile: SpeciesProfile): Promise<RaceProfileItem> {
  const race = await prisma.race.findUnique({ where: { id: raceId }, select: { campaignId: true } });

  if (!race) throw new ContentError(API_ERRORS.NOT_FOUND, 404);

  if (race.campaignId !== campaignId) throw new ContentError(API_ERRORS.FORBIDDEN, 403);

  await assertCampaignRefs(campaignId, {
    career: profile.careerTable.map((r) => r.careerId),
    feat: [...profile.talents, ...profile.randomTalents.map((r) => r.featId)],
  });

  await prisma.raceProfile.upsert({ where: { raceId }, create: { raceId, campaignId, profile }, update: { profile } });

  return { raceId, profile };
}
