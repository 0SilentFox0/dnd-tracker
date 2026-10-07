import {
  campaignDelete,
  campaignGet,
  campaignPatch,
  campaignPost,
  campaignPut,
} from "@/lib/api/client";
import { type CharacterTypeValue } from "@/lib/constants/characters";
import type { GoalInput } from "@/lib/schemas/character-goals";
import { formDataToCharacter } from "@/lib/utils/characters/character-form";
import type { Character, CharacterFormData, CharacterGoal, CharacterListItem, CharacterSheet } from "@/types/characters";

/**
 * Отримує персонажа за ID
 */
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

export const getCharacterSheet = (campaignId: string, characterId: string) => campaignGet<CharacterSheet>(campaignId, `/characters/${characterId}/sheet`);

/**
 * Отримує список персонажів кампанії
 */
export async function getCharacters(
  campaignId: string,
  opts?: { type?: CharacterTypeValue; compact?: boolean },
): Promise<CharacterListItem[]> {
  const params = new URLSearchParams();

  if (opts?.type) params.set("type", opts.type);

  if (opts?.compact) params.set("compact", "1");

  const qs = params.toString();

  const path = qs ? `/characters?${qs}` : "/characters";

  return campaignGet<Character[]>(campaignId, path);
}

/**
 * Створює нового персонажа
 */
export async function createCharacter(
  campaignId: string,
  data: CharacterFormData,
): Promise<Character> {
  const flatData = formDataToCharacter(data);

  return campaignPost<Character>(campaignId, "/characters", flatData);
}

/**
 * Оновлює персонажа
 */
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

/**
 * Підняти рівень персонажа (лише DM)
 */
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

/**
 * Видаляє персонажа
 */
export async function deleteCharacter(
  campaignId: string,
  characterId: string,
): Promise<void> {
  await campaignDelete<void>(campaignId, `/characters/${characterId}`);
}

/**
 * Видаляє всіх персонажів гравців кампанії
 */
export async function deleteAllCharacters(
  campaignId: string,
): Promise<{ success: boolean; deleted: number }> {
  return campaignDelete<{ success: boolean; deleted: number }>(
    campaignId,
    "/characters",
  );
}
