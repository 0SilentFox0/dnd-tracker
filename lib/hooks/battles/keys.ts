export const battleKeys = {
  scene: (campaignId: string, battleId: string) => ["battle", campaignId, battleId] as const,
  summary: (campaignId: string, battleId: string) => ["battle-summary", campaignId, battleId] as const,
  list: (campaignId: string) => ["battles", campaignId] as const,
  active: () => ["active-battles"] as const,
  balance: (campaignId: string) => ["battle-balance", campaignId] as const,
  balanceAll: () => ["battle-balance"] as const,
  audio: (campaignId: string, battleId: string) => ["battle-audio", campaignId, battleId] as const,
};

export const battleQueryKey = battleKeys.scene;
