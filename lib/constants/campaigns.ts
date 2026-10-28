export const CampaignRole = { DM: "dm", PLAYER: "player" } as const;

export type CampaignRoleValue = (typeof CampaignRole)[keyof typeof CampaignRole];

export const CampaignStatus = { ACTIVE: "active", ARCHIVED: "archived" } as const;

export type CampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus];

export const CampaignKind = { CAMPAIGN: "campaign", TEMPLATE: "template" } as const;

export type CampaignKind = (typeof CampaignKind)[keyof typeof CampaignKind];

export const CampaignVisibility = { PRIVATE: "private", OFFICIAL: "official" } as const;

export type CampaignVisibility = (typeof CampaignVisibility)[keyof typeof CampaignVisibility];

export const SRD_TEMPLATE_NAME = "5e SRD 5.2";
