import type { AdvanceBody, AdvanceResult, CareerResult, WfrpDraftIdentityInput, WfrpDraftInput } from "./types";

import { campaignDelete, campaignPatch, campaignPost } from "@/lib/api/client";
import type { Character } from "@/types/characters";

export const createWfrpDraft = (campaignId: string, body: WfrpDraftInput) => campaignPost<Character>(campaignId, "/characters/draft", body);

export const updateWfrpDraftIdentity = (campaignId: string, characterId: string, body: WfrpDraftIdentityInput) => campaignPatch<Character>(campaignId, `/characters/${characterId}/draft`, body);

export const advanceCharacter = (campaignId: string, characterId: string, body: AdvanceBody) => campaignPost<AdvanceResult>(campaignId, `/characters/${characterId}/advance`, body);

export const undoCharacterAdvance = (campaignId: string, characterId: string) => campaignDelete<AdvanceResult>(campaignId, `/characters/${characterId}/advance`);

export const setCharacterCareer = (campaignId: string, characterId: string, careerId: string) => campaignPost<CareerResult>(campaignId, `/characters/${characterId}/career`, { careerId });

export const advanceCharacterCareer = (campaignId: string, characterId: string, force?: boolean) => campaignPost<CareerResult>(campaignId, `/characters/${characterId}/career/advance`, { force });
