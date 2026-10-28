import { CampaignRole, CampaignVisibility } from "@/lib/constants/campaigns";

export const isDmMember = (members: ReadonlyArray<{ role: string }> | undefined): boolean => members?.[0]?.role === CampaignRole.DM;

export const canReadSource = (visibility: string, members: ReadonlyArray<{ role: string }> | undefined): boolean =>
  visibility === CampaignVisibility.OFFICIAL || isDmMember(members);
