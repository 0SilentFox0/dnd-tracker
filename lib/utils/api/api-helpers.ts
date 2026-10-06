export function getCampaignId(paramsId?: string | null): string {
  if (!paramsId) throw new Error("Campaign ID is required");

  return paramsId;
}

export function getCampaignApiUrl(endpoint: string, campaignId?: string | null): string {
  return `/api/campaigns/${getCampaignId(campaignId)}${endpoint}`;
}
