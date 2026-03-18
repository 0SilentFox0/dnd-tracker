/**
 * API сервіс для роботи з кампаніями
 */

import {
  campaignDelete,
  campaignGet,
  campaignPatch,
  request,
} from "@/lib/api/client";
import type { Campaign, CampaignMember } from "@/types/campaigns";

export type ActiveBattle = { id: string; campaignId: string };

/**
 * Отримує активні бої в кампаніях, де користувач є учасником.
 */
export async function getActiveBattles(): Promise<ActiveBattle[]> {
  return request<ActiveBattle[]>("/api/campaigns/active-battles");
}

export async function updateCampaign(
  campaignId: string,
  data: Partial<{
    name: string;
    description: string | null;
    maxLevel: number;
    xpMultiplier: number;
    allowPlayerEdit: boolean;
    status: string;
  }>,
): Promise<Campaign> {
  return campaignPatch<Campaign>(campaignId, "", data);
}

/**
 * Отримує кампанію за ID
 */
export async function getCampaign(campaignId: string): Promise<Campaign> {
  return campaignGet<Campaign>(campaignId, "");
}

/**
 * Отримує список учасників кампанії
 */
export async function getCampaignMembers(
  campaignId: string
): Promise<CampaignMember[]> {
  const campaign = await getCampaign(campaignId);

  return (
    campaign.members?.map((m) => ({
      id: m.user?.id || m.userId,
      displayName: m.user?.displayName || m.user?.email || "Unknown",
      email: m.user?.email || "",
    })) || []
  );
}

/**
 * Створює нову кампанію
 */
export async function createCampaign(data: {
  name: string;
  description?: string;
  maxLevel?: number;
  xpMultiplier?: number;
  allowPlayerEdit?: boolean;
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
