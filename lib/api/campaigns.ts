/**
 * API сервіс для роботи з кампаніями
 */

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
  dmUserId: string;
  maxLevel: number;
  xpMultiplier: number;
  allowPlayerEdit: boolean;
  status: string;
  members?: Array<{
    id: string;
    userId: string;
    role: string;
    user?: {
      id: string;
      displayName: string;
      email: string;
    };
  }>;
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
  }>
): Promise<Campaign> {
  const response = await fetch(`/api/campaigns/${campaignId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update campaign");
  }

  return response.json();
}

export interface CampaignMember {
  id: string;
  displayName: string;
  email: string;
}

/**
 * Отримує кампанію за ID
 */
export async function getCampaign(campaignId: string): Promise<Campaign> {
  const response = await fetch(`/api/campaigns/${campaignId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch campaign");
  }
  return response.json();
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
  const response = await fetch("/api/campaigns", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create campaign");
  }

  return response.json();
}

/**
 * Приєднується до кампанії за кодом запрошення
 */
export async function joinCampaign(inviteCode: string): Promise<{
  campaign: Campaign;
}> {
  const response = await fetch("/api/campaigns/join", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inviteCode }),
  });

  if (!response.ok) {
    const error = await response.json();
    const errorMessage = typeof error.error === "string" 
      ? error.error 
      : Array.isArray(error.error) 
        ? error.error.map((e: { message?: string }) => e.message || JSON.stringify(e)).join(", ")
        : "Failed to join campaign";
    throw new Error(errorMessage);
  }

  const data = await response.json();
  // API повертає member з campaign включеним
  return {
    campaign: data.campaign as Campaign,
  };
}
