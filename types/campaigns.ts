import type { SYNC_SCOPES, SYNC_STATUSES } from "@/lib/constants/source-sync";

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
  credits?: string | null;
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

export interface CampaignSettingsMeta {
  createdFromId: string | null;
  isTemplate: boolean;
  credits?: string | null;
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

export type SourceSyncScope = (typeof SYNC_SCOPES)[number];

export type SourceSyncStatus = (typeof SYNC_STATUSES)[number];

export type SyncRef = { scope: SourceSyncScope; key: string; sourceHash: string | null; status: SourceSyncStatus };

export type SourceApplyBody = { apply: SyncRef[]; ignore: SyncRef[] };

export type SourceDiffItem = {
  scope: SourceSyncScope;
  key: string;
  localId: string | null;
  name: string;
  status: SourceSyncStatus;
  changedFields: string[];
  sourceHash: string | null;
  requires: Array<{ scope: SourceSyncScope; key: string; name: string }>;
  usage?: { characters: number; content: number };
};

export type SourceDiff = { source: { id: string; name: string; kind: string }; syncedAt: string | null; items: SourceDiffItem[] };

export type SourceApplyResult = { applied: number; ignored: number; autoAdded: Array<{ scope: SourceSyncScope; key: string; name: string }>; warnings: string[] };
