import { DefaultChatTransport, type UIMessage } from "ai";

import { getCampaignApiUrl } from "./api-helpers";
import { campaignDelete, campaignGet, campaignPatch, campaignPost, campaignPut, campaignRequest, request } from "./client";

import type { AiImageAspect, AiProvider } from "@/lib/constants/ai";
import type {
  AiChatMessage, AiCredentialSummary, AiFocus, AiProposal, AiProposalStatus, AiSettings, AiThread, AiThreadMode, ApiTokenSummary, CreatedApiToken,
} from "@/types/ai";
import type { ScenarioPage } from "@/types/scenario";
import type { SlideDeck } from "@/types/show";

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const getAiCredentials = () => request<AiCredentialSummary[]>("/api/ai/credentials", { cache: "no-store" });

export const saveAiCredential = (provider: AiProvider, body: { apiKey: string; defaultModel?: string | null }) =>
  request<AiCredentialSummary>(`/api/ai/credentials/${provider}`, json("PUT", body));

export const patchAiCredential = (provider: AiProvider, body: { defaultModel: string | null }) =>
  request<AiCredentialSummary>(`/api/ai/credentials/${provider}`, json("PATCH", body));

export const deleteAiCredential = (provider: AiProvider) => request<{ ok: true }>(`/api/ai/credentials/${provider}`, { method: "DELETE" });

export const getAiThreads = (campaignId: string, pageId?: string) =>
  campaignGet<AiThread[]>(campaignId, `/ai/threads${pageId ? `?pageId=${encodeURIComponent(pageId)}` : ""}`, { cache: "no-store" });

export const createAiThread = (campaignId: string, body: { mode: AiThreadMode; scenarioPageId?: string | null; provider: AiProvider; model?: string }) =>
  campaignPost<AiThread>(campaignId, "/ai/threads", body);

export const patchAiThread = (campaignId: string, threadId: string, body: { title?: string; provider?: AiProvider; model?: string }) =>
  campaignPatch<AiThread>(campaignId, `/ai/threads/${threadId}`, body);


export const getAiThreadMessages = (campaignId: string, threadId: string) =>
  campaignGet<{ thread: AiThread; messages: AiChatMessage[] }>(campaignId, `/ai/threads/${threadId}/messages`, { cache: "no-store" });

export const getAiProposals = (campaignId: string, filter: { pageId?: string; status?: AiProposalStatus }) =>
  campaignGet<AiProposal[]>(
    campaignId,
    `/ai/proposals?${new URLSearchParams(Object.entries(filter).filter(([, v]) => v) as [string, string][])}`,
    { cache: "no-store" },
  );

export const applyAiProposal = (campaignId: string, proposalId: string) => campaignPost<ScenarioPage | { deck: SlideDeck }>(campaignId, `/ai/proposals/${proposalId}/apply`, {});

export const rejectAiProposal = (campaignId: string, proposalId: string) => campaignPost<AiProposal>(campaignId, `/ai/proposals/${proposalId}/reject`, {});

export const getAiSettings = (campaignId: string) => campaignGet<AiSettings>(campaignId, "/ai/settings", { cache: "no-store" });

export const saveAiSettings = (campaignId: string, body: { instructions: string }) => campaignPut<AiSettings>(campaignId, "/ai/settings", body);

export const getApiTokens = (campaignId: string) => campaignGet<ApiTokenSummary[]>(campaignId, "/api-tokens", { cache: "no-store" });

export const createApiToken = (campaignId: string, name: string) => campaignPost<CreatedApiToken>(campaignId, "/api-tokens", { name });

export const revokeApiToken = (campaignId: string, tokenId: string) => campaignDelete<{ ok: true }>(campaignId, `/api-tokens/${tokenId}`);

// the server keeps the history; send only the new text and the DM's focus
export const createAiChatTransport = (campaignId: string, threadId: string, getFocus: () => AiFocus | undefined) =>
  new DefaultChatTransport<UIMessage>({
    api: getCampaignApiUrl(`/ai/threads/${threadId}/chat`, campaignId),
    prepareSendMessagesRequest: ({ messages }) => {
      const last = messages[messages.length - 1];

      const text = last?.parts.map((p) => (p.type === "text" ? p.text : "")).join("") ?? "";

      return { body: { text, focus: getFocus() } };
    },
  });

export type GenerateSlideImageBody = { prompt: string; provider: AiProvider; model: string; aspect: AiImageAspect; useCampaignStyle: boolean };

export const generateSlideImage = (campaignId: string, body: GenerateSlideImageBody) => campaignPost<{ url: string }>(campaignId, "/decks/generate-image", body);

export const discardGeneratedImage = (campaignId: string, url: string) =>
  campaignRequest<{ removed: boolean }>(campaignId, "/decks/generated-image", { method: "DELETE", body: { url } });
