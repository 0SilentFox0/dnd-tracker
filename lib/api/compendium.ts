import { campaignGet, campaignPost } from "@/lib/api/client";
import type { CompendiumConfirmBody, CompendiumEntriesPage, CompendiumPreview, CompendiumReport, CompendiumRunsPage, CompendiumTargets, ImportInput, MediaProgress } from "@/types/compendium-import";

const NO_STORE = { cache: "no-store" } as const;

export const previewCompendium = (campaignId: string, input: ImportInput, signal?: AbortSignal) =>
  campaignPost<CompendiumPreview>(campaignId, "/compendium/preview", { input }, { ...NO_STORE, signal });

export const confirmCompendium = (campaignId: string, body: CompendiumConfirmBody, signal?: AbortSignal) =>
  campaignPost<CompendiumReport>(campaignId, "/compendium/confirm", body, { ...NO_STORE, signal });

export const processCompendiumMedia = (campaignId: string, body: { runId: string; retryFailed?: boolean }, signal?: AbortSignal) =>
  campaignPost<MediaProgress>(campaignId, "/compendium/media", body, { ...NO_STORE, signal });

export const getCompendiumOptions = (campaignId: string, signal?: AbortSignal) =>
  campaignGet<CompendiumTargets>(campaignId, "/compendium/options", { ...NO_STORE, signal });

export const getCompendiumReports = (campaignId: string, offset: number, signal?: AbortSignal) =>
  campaignGet<CompendiumRunsPage>(campaignId, `/compendium/reports?offset=${offset}`, { ...NO_STORE, signal });

export const getCompendiumRunReport = (campaignId: string, runId: string) =>
  campaignGet<{ runs: Array<{ report: CompendiumReport }> }>(campaignId, `/compendium/reports?runId=${encodeURIComponent(runId)}`, NO_STORE);

export const getCompendiumEntries = (campaignId: string, params: { kind: string; targetId: string; offset: number }, signal?: AbortSignal) =>
  campaignGet<CompendiumEntriesPage>(campaignId, `/compendium/entries?${new URLSearchParams({ kind: params.kind, targetId: params.targetId, offset: String(params.offset) })}`, { ...NO_STORE, signal });
