/**
 * API сервіс для роботи з основними навиками
 */

import { createCampaignCrudApi } from "@/lib/api/client";
import type { MainSkill, MainSkillFormData } from "@/types/main-skills";

const mainSkillsApi = createCampaignCrudApi<
  MainSkill,
  MainSkillFormData,
  Partial<MainSkillFormData>,
  void
>("/main-skills");

export const getMainSkills = mainSkillsApi.list;
export const createMainSkill = mainSkillsApi.create;
export const updateMainSkill = mainSkillsApi.update;
export const deleteMainSkill = mainSkillsApi.remove;
