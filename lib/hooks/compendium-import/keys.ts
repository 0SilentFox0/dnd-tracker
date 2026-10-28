export const compendiumKeys = {
  all: (campaignId: string) => ["compendium-import", campaignId] as const,
  reports: (campaignId: string, offset: number) => ["compendium-import", campaignId, "reports", offset] as const,
  entries: (campaignId: string, offset: number, kind: string, targetId: string) => ["compendium-import", campaignId, "entries", kind, targetId, offset] as const,
  options: (campaignId: string) => ["compendium-import", campaignId, "options"] as const,
};
