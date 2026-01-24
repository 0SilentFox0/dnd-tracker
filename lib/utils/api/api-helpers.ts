/**
 * Хелпери для роботи з API
 */

import { DEFAULT_CAMPAIGN_ID } from "@/lib/constants/campaigns";

/**
 * Отримує ID кампанії з параметрів або використовує дефолтний
 * Корисно для тестування та розробки
 */
export function getCampaignId(
  paramsId?: string | null,
  useDefault: boolean = true
): string {
  if (paramsId) {
    return paramsId;
  }

  if (useDefault) {
    return DEFAULT_CAMPAIGN_ID;
  }

  throw new Error("Campaign ID is required");
}

/**
 * Створює URL для API endpoint кампанії
 */
export function getCampaignApiUrl(
  endpoint: string,
  campaignId?: string | null
): string {
  const id = getCampaignId(campaignId);

  return `/api/campaigns/${id}${endpoint}`;
}
