export const battleKeys = {
  scene: (campaignId: string, battleId: string) => ["battle", campaignId, battleId] as const,
  list: (campaignId: string) => ["battles", campaignId] as const,
  active: () => ["active-battles"] as const,
  balance: (campaignId: string) => ["battle-balance", campaignId] as const,
  balanceAll: () => ["battle-balance"] as const,
};

export const battleQueryKey = battleKeys.scene;
