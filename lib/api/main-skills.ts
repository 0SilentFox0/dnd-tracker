/**
 * API сервіс для роботи з основними навиками
 */

import {
  campaignDelete,
  campaignGet,
  campaignPatch,
  campaignPost,
} from "@/lib/api/client";
import type { MainSkill, MainSkillFormData } from "@/types/main-skills";

/**
 * Отримує список основних навиків кампанії
 */
export async function getMainSkills(
  campaignId: string,
): Promise<MainSkill[]> {
  return campaignGet<MainSkill[]>(campaignId, "/main-skills");
}

/**
 * Створює новий основний навик
 */
export async function createMainSkill(
  campaignId: string,
  data: MainSkillFormData,
): Promise<MainSkill> {
  return campaignPost<MainSkill>(campaignId, "/main-skills", data);
}

/**
 * Оновлює основний навик
 */
export async function updateMainSkill(
  campaignId: string,
  mainSkillId: string,
  data: Partial<MainSkillFormData>,
): Promise<MainSkill> {
  return campaignPatch<MainSkill>(
    campaignId,
    `/main-skills/${mainSkillId}`,
    data,
  );
}

/**
 * Видаляє основний навик
 */
export async function deleteMainSkill(
  campaignId: string,
  mainSkillId: string,
): Promise<void> {
  await campaignDelete<void>(campaignId, `/main-skills/${mainSkillId}`);
}
