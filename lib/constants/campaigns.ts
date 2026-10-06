export const CampaignRole = { DM: "dm", PLAYER: "player" } as const;

export type CampaignRoleValue = (typeof CampaignRole)[keyof typeof CampaignRole];
