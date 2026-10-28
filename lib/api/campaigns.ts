import {
  campaignDelete,
  campaignGet,
  campaignPatch,
  request,
} from "@/lib/api/client";
import type { ActiveSessions, Campaign, CampaignMember, CampaignSettings } from "@/types/campaigns";

/**
 * Отримує активні бої й покази в кампаніях, де користувач є учасником.
 */
export async function getActiveSessions(): Promise<ActiveSessions> {
  return request<ActiveSessions>("/api/campaigns/active-battles?withShows=1");
}

export async function updateCampaign(
  campaignId: string,
  data: Partial<CampaignSettings>,
): Promise<Campaign> {
  return campaignPatch<Campaign>(campaignId, "", data);
}

export async function getCampaignMembers(campaignId: string): Promise<CampaignMember[]> {
  return campaignGet<CampaignMember[]>(campaignId, "/members");
}

/**
 * Створює нову кампанію
 */
export async function createCampaign(data: {
  name: string;
  description?: string;
  maxLevel?: number;
  allowPlayerEdit?: boolean;
  critChoiceByDm?: boolean;
}): Promise<Campaign> {
  return request<Campaign>("/api/campaigns", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Приєднується до кампанії за кодом запрошення
 */
export async function joinCampaign(inviteCode: string): Promise<{
  campaign: Campaign;
}> {
  const data = await request<{ campaign: Campaign }>("/api/campaigns/join", {
    method: "POST",
    body: JSON.stringify({ inviteCode }),
  });

  return { campaign: data.campaign };
}

/**
 * Видаляє учасника з кампанії (лише DM)
 */
export async function removeCampaignMember(
  campaignId: string,
  memberId: string,
): Promise<{ success: boolean }> {
  return campaignDelete<{ success: boolean }>(
    campaignId,
    `/members/${memberId}`,
  );
}

export async function deleteCampaign(campaignId: string): Promise<{ success: boolean }> {
  return campaignDelete<{ success: boolean }>(campaignId, "");
}
