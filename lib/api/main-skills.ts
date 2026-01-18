/**
 * API сервіс для роботи з основними навиками
 */

import type { MainSkill, MainSkillFormData } from "@/lib/types/main-skills";

/**
 * Отримує список основних навиків кампанії
 */
export async function getMainSkills(campaignId: string): Promise<MainSkill[]> {
  const response = await fetch(`/api/campaigns/${campaignId}/main-skills`);
  if (!response.ok) {
    throw new Error("Failed to fetch main skills");
  }
  return response.json();
}

/**
 * Створює новий основний навик
 */
export async function createMainSkill(
  campaignId: string,
  data: MainSkillFormData
): Promise<MainSkill> {
  const response = await fetch(`/api/campaigns/${campaignId}/main-skills`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    // Якщо це помилка валідації Zod, показуємо деталі
    if (Array.isArray(error.error)) {
      const errorMessages = error.error
        .map((issue: { path: string[]; message: string }) => {
          const field = issue.path.join(".");
          return `${field}: ${issue.message}`;
        })
        .join(", ");
      throw new Error(errorMessages);
    }
    throw new Error(error.error || "Failed to create main skill");
  }

  return response.json();
}

/**
 * Оновлює основний навик
 */
export async function updateMainSkill(
  campaignId: string,
  mainSkillId: string,
  data: Partial<MainSkillFormData>
): Promise<MainSkill> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/main-skills/${mainSkillId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update main skill");
  }

  return response.json();
}

/**
 * Видаляє основний навик
 */
export async function deleteMainSkill(
  campaignId: string,
  mainSkillId: string
): Promise<void> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/main-skills/${mainSkillId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete main skill");
  }
}
