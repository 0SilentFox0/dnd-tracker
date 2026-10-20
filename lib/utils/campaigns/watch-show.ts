import { pickActiveTarget } from "@/lib/utils/campaigns/join-battle";
import type { ActiveShowRef } from "@/types/campaigns";

export const showHref = (s: ActiveShowRef) => `/campaigns/${s.campaignId}/show`;

export const pickWatchShow = (shows: ActiveShowRef[], pathname: string | null) => pickActiveTarget(shows, pathname, showHref);
