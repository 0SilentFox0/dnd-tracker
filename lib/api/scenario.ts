import { campaignGet, campaignPatch, campaignPost, campaignPut, createCampaignCrudApi } from "./client";

import type {
  CreateScenarioPageData, GeneratedSummary, MentionOption, SaveScenarioContentData, ScenarioIndex, ScenarioPage, ScenarioPageSummary, ScenarioSearchHit,
  ScenarioSection, ScenarioSectionPatch, ScenarioSummaries, ScenarioVersionSummary, UpdateScenarioMetaData,
} from "@/types/scenario";

const pagesApi = createCampaignCrudApi<ScenarioPageSummary, CreateScenarioPageData, UpdateScenarioMetaData, { ok: true }>("/scenario", { listCache: "no-store" });

export const getScenarioPages = pagesApi.list;
export const createScenarioPage = pagesApi.create;
export const updateScenarioMeta = pagesApi.update;
export const deleteScenarioPage = pagesApi.remove;

export const getScenarioPage = (campaignId: string, pageId: string) => campaignGet<ScenarioPage>(campaignId, `/scenario/${pageId}`, { cache: "no-store" });

export const saveScenarioContent = (campaignId: string, pageId: string, data: SaveScenarioContentData) => campaignPut<{ version: number }>(campaignId, `/scenario/${pageId}`, data);

export const patchScenarioSection = (campaignId: string, pageId: string, sectionId: string, data: ScenarioSectionPatch) =>
  campaignPatch<{ version: number; section: ScenarioSection }>(campaignId, `/scenario/${pageId}/sections/${sectionId}`, data);

export const getScenarioVersions = (campaignId: string, pageId: string) => campaignGet<ScenarioVersionSummary[]>(campaignId, `/scenario/${pageId}/versions`, { cache: "no-store" });

export const restoreScenarioVersion = (campaignId: string, pageId: string, versionId: string) => campaignPost<ScenarioPage>(campaignId, `/scenario/${pageId}/versions`, { versionId });

export const searchScenario = (campaignId: string, q: string) => campaignGet<ScenarioSearchHit[]>(campaignId, `/scenario/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });

export const searchMentions = (campaignId: string, q: string) => campaignGet<MentionOption[]>(campaignId, `/scenario/mentions?q=${encodeURIComponent(q)}`);

export const getScenarioIndex = (campaignId: string) => campaignGet<ScenarioIndex>(campaignId, "/scenario/index", { cache: "no-store" });

export const getScenarioSummaries = (campaignId: string) => campaignGet<ScenarioSummaries>(campaignId, "/scenario/summaries", { cache: "no-store" });

export const generateScenarioSummary = (campaignId: string, pageId: string, force?: boolean) => campaignPost<GeneratedSummary>(campaignId, `/scenario/${pageId}/summary`, force ? { force: true } : {});
