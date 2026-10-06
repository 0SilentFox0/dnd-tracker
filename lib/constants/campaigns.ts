/**
 * Константи для кампаній
 */

/**
 * ID тестової/робочої кампанії для розробки
 */
export const DEFAULT_CAMPAIGN_ID = "cmkfwmhxi0001kgzwpq5pwwr9";

export const CampaignRole = { DM: "dm", PLAYER: "player" } as const;

export type CampaignRoleValue = (typeof CampaignRole)[keyof typeof CampaignRole];
