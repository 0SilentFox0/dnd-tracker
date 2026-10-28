import { campaignGet, campaignPost } from "@/lib/api/client";
import type { AiMapResult, ImportKind, ImportMode, ImportRecord, ImportReport } from "@/types/content-import";

export const importContentRows = (campaignId: string, kind: ImportKind, body: { rows: ImportRecord[]; mode: ImportMode; dryRun: boolean }) =>
  campaignPost<ImportReport>(campaignId, `/content-import/${kind}`, body);

export const getImportAiAvailability = (campaignId: string, kind: ImportKind) => campaignGet<{ available: boolean }>(campaignId, `/content-import/${kind}/ai-map`);

export const suggestImportMapping = (campaignId: string, kind: ImportKind, body: { headers: string[]; sample: Array<Record<string, string>> }) =>
  campaignPost<AiMapResult>(campaignId, `/content-import/${kind}/ai-map`, body);

export const contentExampleUrl = (campaignId: string, kind: ImportKind) => `/api/campaigns/${campaignId}/content-import/${kind}/example.csv`;

export const contentExportUrl = (campaignId: string, kind: ImportKind) => `/api/campaigns/${campaignId}/content-export/${kind}`;
