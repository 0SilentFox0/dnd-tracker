/**
 * Типи для основних навиків
 */

export interface MainSkill {
  id: string;
  campaignId: string;
  name: string;
  color: string;
  icon?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MainSkillFormData {
  name: string;
  color: string;
  icon?: string;
}
