export const spellKeys = {
  list: (campaignId: string) => ["spells", campaignId] as const,
  refs: (campaignId: string) => ["spells", campaignId, "refs"] as const,
  byIds: (campaignId: string, idsKey: string) => ["spells", campaignId, "by-ids", idsKey] as const,
  detail: (campaignId: string, spellId: string) => ["spell", campaignId, spellId] as const,
  groups: (campaignId: string) => ["spell-groups", campaignId] as const,
};
