/**
 * API сервіс для роботи з персонажами
 */

import {
  campaignDelete,
  campaignGet,
  campaignPatch,
  campaignPost,
  campaignRequest,
} from "@/lib/api/client";
import { formDataToCharacter } from "@/lib/utils/characters/character-form";
import type { Character, CharacterFormData } from "@/types/characters";

export interface DamagePreviewResponse {
  melee: { total: number; [key: string]: unknown };
  ranged: { total: number; [key: string]: unknown };
  magic?: { total: number; [key: string]: unknown } | null;
}

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

/**
 * Отримує превʼю шкоди персонажа (melee/ranged total).
 */
export async function getDamagePreview(
  campaignId: string,
  characterId: string,
  params?: {
    meleeMultiplier?: number;
    rangedMultiplier?: number;
    meleeDiceSum?: number | null;
    rangedDiceSum?: number | null;
    spellId?: string | null;
    spellDiceSum?: number | null;
  },
): Promise<DamagePreviewResponse | null> {
  const search = new URLSearchParams();

  if (params?.meleeMultiplier != null && params.meleeMultiplier !== 1) {
    search.set("meleeMultiplier", String(params.meleeMultiplier));
  }

  if (params?.rangedMultiplier != null && params.rangedMultiplier !== 1) {
    search.set("rangedMultiplier", String(params.rangedMultiplier));
  }

  if (params?.meleeDiceSum != null) {
    search.set("meleeDiceSum", String(params.meleeDiceSum));
  }

  if (params?.rangedDiceSum != null) {
    search.set("rangedDiceSum", String(params.rangedDiceSum));
  }

  if (params?.spellId) {
    search.set("spellId", params.spellId);
  }

  if (params?.spellDiceSum != null) {
    search.set("spellDiceSum", String(params.spellDiceSum));
  }

  const qs = search.toString();

  const path = `/characters/${characterId}/damage-preview${qs ? `?${qs}` : ""}`;

  try {
    return await campaignRequest<DamagePreviewResponse>(campaignId, path);
  } catch {
    return null;
  }
}

/**
 * Отримує список персонажів кампанії
 */
export async function getCharacters(
  campaignId: string,
  opts?: { type?: "player" | "npc_hero"; compact?: boolean },
): Promise<Character[]> {
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
