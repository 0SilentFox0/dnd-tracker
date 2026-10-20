import { kvDel } from "@/lib/cache/kv";

export const campaignListKey = (userId: string) => `campaigns:${userId}`;

export async function invalidateCampaignLists(userIds: Iterable<string>): Promise<void> {
  await Promise.all([...new Set(userIds)].map((id) => kvDel(campaignListKey(id))));
}
