export interface Campaign {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
  dmUserId: string;
  maxLevel: number;
  xpMultiplier: number;
  allowPlayerEdit: boolean;
  status: string;
  members?: Array<{
    id: string;
    userId: string;
    role: string;
    user?: {
      id: string;
      displayName: string;
      email: string;
    };
  }>;
}

export interface CampaignMember {
  id: string;
  displayName: string;
  email: string;
}

export interface CampaignSettings {
  name: string;
  description: string | null;
  maxLevel: number;
  xpMultiplier: number;
  allowPlayerEdit: boolean;
  status: string;
}
