export interface Campaign {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
  dmUserId: string;
  maxLevel: number;
  allowPlayerEdit: boolean;
  status: string;
  kind?: "campaign" | "template";
  members?: CampaignMembership[];
}

export type CampaignWithWarnings = Campaign & { warnings?: string[] };

export type CampaignBundle = Record<string, unknown>;

export interface TemplateCard {
  id: string;
  name: string;
  description: string | null;
  visibility: string;
  counts: Record<string, number>;
}

export interface TemplateList {
  official: TemplateCard[];
  mine: TemplateCard[];
}

export interface BundleFile {
  name: string;
  bundle: CampaignBundle;
  entities: number;
}

export type TemplateSelection = { templateId?: string | null; file?: BundleFile };

/** Рядок campaign_members з user-relation (сторінка кампанії). */
export interface CampaignMembership {
  id: string;
  userId: string;
  role: string;
  user?: PublicUser;
}

export interface PublicUser {
  id: string;
  displayName: string;
  avatar: string | null;
}

/** Рядок GET /members: `id` — userId; `email` лише для DM. */
export interface CampaignMember {
  id: string;
  displayName: string;
  email?: string;
}

export interface CampaignSettings {
  name: string;
  description: string | null;
  maxLevel: number;
  allowPlayerEdit: boolean;
  status: string;
}

export interface ActiveBattleRef {
  id: string;
  campaignId: string;
}

export interface ActiveShowRef {
  campaignId: string;
}

export interface ActiveSessions {
  battles: ActiveBattleRef[];
  shows: ActiveShowRef[];
}
