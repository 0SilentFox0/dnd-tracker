export const CampaignRole = { DM: "dm", PLAYER: "player" } as const;

export type CampaignRoleValue = (typeof CampaignRole)[keyof typeof CampaignRole];

export const CampaignStatus = { ACTIVE: "active", ARCHIVED: "archived" } as const;

export type CampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus];
