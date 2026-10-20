export interface Campaign {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
  dmUserId: string;
  maxLevel: number;
  allowPlayerEdit: boolean;
  status: string;
  members?: CampaignMembership[];
}

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

export interface ActiveSessions {
  battles: ActiveBattleRef[];
  shows: { campaignId: string }[];
}
