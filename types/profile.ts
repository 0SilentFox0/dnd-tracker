export interface ProfileCampaign {
    id: string;
    name: string;
    role: string;
    updatedAt: string;
}

export interface ProfileCharacter {
    id: string;
    name: string;
    level: number;
    className: string;
    avatar: string | null;
    campaignId: string;
    campaignName: string;
}

export interface ProfileSummary {
    campaigns: number;
    characters: number;
    lastActivity: string | null;
    recentCampaigns: ProfileCampaign[];
    recentCharacters: ProfileCharacter[];
}
