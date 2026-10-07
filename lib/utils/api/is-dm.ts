import { CampaignRole } from "@/lib/constants/campaigns";

export const isDmMember = (members: ReadonlyArray<{ role: string }> | undefined): boolean => members?.[0]?.role === CampaignRole.DM;
