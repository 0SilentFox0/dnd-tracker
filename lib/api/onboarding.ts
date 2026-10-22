import { campaignGet, request } from "./client";

import type { CampaignOnboardingResponse, OnboardingFlagsResponse, ResetScope, SetFlagBody } from "@/types/onboarding";

export const getOnboardingFlags = () => request<OnboardingFlagsResponse>("/api/onboarding", { cache: "no-store" });

export const setOnboardingFlag = (body: SetFlagBody) => request<{ ok: true }>("/api/onboarding/flags", { method: "PUT", body: JSON.stringify(body) });

export const resetOnboarding = (scope: ResetScope) => request<{ ok: true }>("/api/onboarding/reset", { method: "POST", body: JSON.stringify({ scope }) });

export const getCampaignOnboarding = (campaignId: string) => campaignGet<CampaignOnboardingResponse>(campaignId, "/onboarding", { cache: "no-store" });
