import { battleKeys } from "@/lib/hooks/battles/keys";

export const unitKeys = {
  list: (campaignId: string) => ["units", campaignId] as const,
  detail: (campaignId: string, unitId: string) => ["unit", campaignId, unitId] as const,
};

/** Unit writes change enemy power in battle balance (its query includes unit stats). */
export const unitWriteKeys = (campaignId: string) => [unitKeys.list(campaignId), battleKeys.balance(campaignId)];
