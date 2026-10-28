import { campaignGet, campaignPost } from "@/lib/api/client";
import type { SourceApplyBody, SourceApplyResult, SourceDiff } from "@/types/campaigns";

export const getSourceDiff = (campaignId: string) => campaignGet<SourceDiff>(campaignId, "/source-sync");

export const applySourceChanges = (campaignId: string, body: SourceApplyBody) =>
  campaignPost<SourceApplyResult>(campaignId, "/source-sync", body);
