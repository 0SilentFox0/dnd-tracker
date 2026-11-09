import "server-only";
import { listRaceProfiles } from "@/lib/server/races/race-profile";
import { profileRefIds } from "@/lib/utils/rules/systems/profile-refs";

export async function profileReferences(campaignId: string, ref: { careerId?: string; featId?: string }): Promise<boolean> {
  const items = await listRaceProfiles(campaignId);

  return items.some(({ profile }) => {
    const refs = profileRefIds(profile);

    return (ref.careerId !== undefined && refs.careers.includes(ref.careerId)) || (ref.featId !== undefined && refs.feats.includes(ref.featId));
  });
}
