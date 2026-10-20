export const showKeys = {
  decks: (campaignId: string) => ["show-decks", campaignId] as const,
  deck: (campaignId: string, deckId: string) => ["show-deck", campaignId, deckId] as const,
  state: (campaignId: string) => ["show-state", campaignId] as const,
  audio: (campaignId: string) => ["show-audio", campaignId] as const,
};
