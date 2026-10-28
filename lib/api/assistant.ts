import { campaignGet, campaignPost, campaignPut } from "./client";

import type { AssistantReviewReceipt, IntentDetail, IntentPage, IntentSummary, ReceiptDto } from "@/types/assistant";

export type IntentFilters = { cursor?: string; limit?: number; status?: "pending" };
export const getAssistantIntents = (campaignId: string, filters: IntentFilters = {}) => campaignGet<IntentPage>(campaignId, `/assistant/intents?${new URLSearchParams({ limit: String(Math.min(50, Math.max(1, filters.limit ?? 20))), ...(filters.cursor && { cursor: filters.cursor }), ...(filters.status && { status: filters.status }) })}`, { cache: "no-store" });
export const getAssistantIntent = (campaignId: string, id: string) => campaignGet<IntentDetail>(campaignId, `/assistant/intents/${encodeURIComponent(id)}`, { cache: "no-store" });
export const getAssistantReceipt = (campaignId: string, id: string) => campaignGet<AssistantReviewReceipt>(campaignId, `/assistant/intents/${encodeURIComponent(id)}/receipt`, { cache: "no-store" });
export const confirmAssistantIntent = (campaignId: string, id: string) => campaignPost<ReceiptDto>(campaignId, `/assistant/intents/${encodeURIComponent(id)}/confirm`, {});
export const rejectAssistantIntent = (campaignId: string, id: string) => campaignPost<IntentSummary>(campaignId, `/assistant/intents/${encodeURIComponent(id)}/reject`, {});

export const setAssistantPolicy = (campaignId: string, body: { target: "thread" | "token"; id: string; executionMode: import("@/types/assistant").ExecutionMode }) => campaignPut<{ id: string; executionMode: import("@/types/assistant").ExecutionMode }>(campaignId, "/assistant/policy", body);
export const previewAssistantContext = (campaignId: string, threadId: string, body: { focus?: import("@/types/ai").AiFocus; sessionContext?: import("@/types/ai").AssistantSessionContext }) => campaignPost<import("@/types/ai").AssistantContextPreview>(campaignId, `/ai/threads/${encodeURIComponent(threadId)}/context-preview`, body);
export const getAssistantSourceNotes = (campaignId: string, offset=0) => campaignGet<{items:{canonicalKey:string;title:string}[];nextOffset:number|null}>(campaignId, `/assistant/source-notes?offset=${offset}`, {cache:"no-store"});
