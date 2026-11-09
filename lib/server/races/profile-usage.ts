import "server-only";
import { listRaceProfiles } from "@/lib/server/races/race-profile";

export async function profileReferences(campaignId: string, ref: { careerId?: string; featId?: string }): Promise<boolean> {
  const items = await listRaceProfiles(campaignId);

  return items.some(({ profile: p }) => (ref.careerId !== undefined && p.careerTable.some((r) => r.careerId === ref.careerId))
    || (ref.featId !== undefined && (p.talents.includes(ref.featId) || p.randomTalents.some((r) => r.featId === ref.featId))));
}
