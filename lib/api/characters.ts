import {
  campaignDelete,
  campaignGet,
  campaignPatch,
  campaignPost,
  campaignPut,
} from "@/lib/api/client";
import { type CharacterTypeValue, type GoalKind } from "@/lib/constants/characters";
import type { GoalInput } from "@/lib/schemas/character-goals";
import type { CreateTokenInput } from "@/lib/schemas/character-tokens";
import { formDataToCharacter } from "@/lib/utils/characters/character-form";
import type { Character, CharacterFormData, CharacterGoal, CharacterListItem, CharacterSheet, CharacterToken, DraftInput, RosterHero } from "@/types/characters";

export async function getCharacter(
  campaignId: string,
  characterId: string,
): Promise<Character> {
  return campaignGet<Character>(
    campaignId,
    `/characters/${characterId}`,
  );
}

export const putCharacterGoals = (campaignId: string, characterId: string, goals: GoalInput[], seen?: string[]) =>
  campaignPut<{ goals: CharacterGoal[] }>(campaignId, `/characters/${characterId}/goals`, { goals, seen });

export const putCharacterNotes = (campaignId: string, characterId: string, notes: string) =>
  campaignPut<{ notes: string | null }>(campaignId, `/characters/${characterId}/notes`, { notes });

export const createCharacterToken = (campaignId: string, characterId: string, body: CreateTokenInput) =>
  campaignPost<{ token: CharacterToken }>(campaignId, `/characters/${characterId}/tokens`, body);

export const deleteCharacterToken = (campaignId: string, characterId: string, tokenId: string) =>
  campaignDelete<{ ok: true }>(campaignId, `/characters/${characterId}/tokens/${tokenId}`);

export const getCharacterSheet = (campaignId: string, characterId: string) => campaignGet<CharacterSheet>(campaignId, `/characters/${characterId}/sheet`);

export async function getCharacters(
  campaignId: string,
  opts?: { type?: CharacterTypeValue; status?: "pending"; compact?: boolean },
): Promise<CharacterListItem[]> {
  const params = new URLSearchParams();

  if (opts?.type) params.set("type", opts.type);

  if (opts?.status) params.set("status", opts.status);

  if (opts?.compact) params.set("compact", "1");

  const qs = params.toString();

  const path = qs ? `/characters?${qs}` : "/characters";

  return campaignGet<Character[]>(campaignId, path);
}

export async function createCharacter(
  campaignId: string,
  data: CharacterFormData,
): Promise<Character> {
  const flatData = formDataToCharacter(data);

  return campaignPost<Character>(campaignId, "/characters", flatData);
}

export async function updateCharacter(
  campaignId: string,
  characterId: string,
  data: Partial<CharacterFormData>,
): Promise<Character> {
  const flatData =
    "basicInfo" in data && data.basicInfo
      ? formDataToCharacter(data as CharacterFormData)
      : data;

  return campaignPatch<Character>(
    campaignId,
    `/characters/${characterId}`,
    flatData,
  );
}

export async function levelUpCharacter(
  campaignId: string,
  characterId: string,
): Promise<Character & { levelUpDetails?: unknown }> {
  return campaignPost<Character & { levelUpDetails?: unknown }>(
    campaignId,
    `/characters/${characterId}/level-up`,
    {},
  );
}

export async function deleteCharacter(
  campaignId: string,
  characterId: string,
): Promise<void> {
  await campaignDelete<void>(campaignId, `/characters/${characterId}`);
}

export async function deleteAllCharacters(
  campaignId: string,
): Promise<{ success: boolean; deleted: number }> {
  return campaignDelete<{ success: boolean; deleted: number }>(
    campaignId,
    "/characters",
  );
}

export const getCharacterRoster = (campaignId: string) => campaignGet<RosterHero[]>(campaignId, "/characters/roster");

export const createDraft = (campaignId: string, body: DraftInput) => campaignPost<Character>(campaignId, "/characters/draft", body);

export const updateDraft = (campaignId: string, characterId: string, body: DraftInput) => campaignPatch<Character>(campaignId, `/characters/${characterId}/draft`, body);

export const getBackstoryAvailability = (campaignId: string) => campaignGet<{ available: boolean; image: boolean }>(campaignId, "/characters/draft/backstory");

export const getDraftPortraits = (campaignId: string, race: string) => campaignGet<{ portraits: string[] }>(campaignId, `/characters/draft/portraits?race=${encodeURIComponent(race)}`);

export const generateDraftAvatar = (campaignId: string, body: { name: string; race: string; archetype: string; class: string }) => campaignPost<{ url: string }>(campaignId, "/characters/draft/avatar", body);

export const generateBackstory = (campaignId: string, body: { name: string; race: string; archetype: string; class: string; background?: string }) =>
  campaignPost<{ background: string; goals: Array<{ text: string; kind: GoalKind }> }>(campaignId, "/characters/draft/backstory", body);

export type ReviewBody = { action: "approve" } | { action: "return"; note: string };

export const reviewCharacter = (campaignId: string, characterId: string, body: ReviewBody) =>
  campaignPost<{ id: string; status: string; reviewNote: string | null }>(campaignId, `/characters/${characterId}/review`, body);
