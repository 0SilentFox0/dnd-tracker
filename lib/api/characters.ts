/**
 * API сервіс для роботи з персонажами
 */

import { formDataToCharacter } from "@/lib/utils/characters/character-form";
import type { Character,CharacterFormData } from "@/types/characters";

/**
 * Отримує персонажа за ID
 */
export async function getCharacter(
  campaignId: string,
  characterId: string
): Promise<Character> {
  const response = await fetch(`/api/campaigns/${campaignId}/characters/${characterId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch character");
  }

  return response.json();
}

/**
 * Отримує список персонажів кампанії
 */
export async function getCharacters(
  campaignId: string,
  opts?: { type?: "player" | "npc_hero" }
): Promise<Character[]> {
  const params = opts?.type ? `?type=${opts.type}` : "";

  const response = await fetch(
    `/api/campaigns/${campaignId}/characters${params}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch characters");
  }

  return response.json();
}

/**
 * Створює нового персонажа
 */
export async function createCharacter(
  campaignId: string,
  data: CharacterFormData
): Promise<Character> {
  const flatData = formDataToCharacter(data);

  const response = await fetch(`/api/campaigns/${campaignId}/characters`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(flatData),
  });

  if (!response.ok) {
    const error = await response.json();

    throw new Error(error.error || "Failed to create character");
  }

  return response.json();
}

/**
 * Оновлює персонажа
 */
export async function updateCharacter(
  campaignId: string,
  characterId: string,
  data: Partial<CharacterFormData>
): Promise<Character> {
  // Якщо це повна CharacterFormData, конвертуємо в плоску структуру
  // Якщо це Partial<CharacterFormData>, конвертуємо тільки заповнені групи
  const flatData = "basicInfo" in data && data.basicInfo
    ? formDataToCharacter(data as CharacterFormData)
    : data;

  const response = await fetch(`/api/campaigns/${campaignId}/characters/${characterId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(flatData),
  });

  if (!response.ok) {
    const error = await response.json();

    throw new Error(error.error || "Failed to update character");
  }

  return response.json();
}

/**
 * Видаляє персонажа
 */
export async function deleteCharacter(
  campaignId: string,
  characterId: string
): Promise<void> {
  const response = await fetch(`/api/campaigns/${campaignId}/characters/${characterId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();

    throw new Error(error.error || "Failed to delete character");
  }
}

/**
 * Видаляє всіх персонажів гравців кампанії
 */
export async function deleteAllCharacters(
  campaignId: string
): Promise<{ success: boolean; deleted: number }> {
  const response = await fetch(`/api/campaigns/${campaignId}/characters`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();

    throw new Error(error.error || "Failed to delete all characters");
  }

  return response.json();
}
