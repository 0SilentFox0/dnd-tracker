/**
 * Типи для основних навиків
 */

export interface MainSkill {
  id: string;
  campaignId: string;
  name: string;
  color: string;
  icon?: string | null;
  /** Якщо true — не виводити цей основний навик у колі дерева прокачки */
  isEnableInSkillTree?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MainSkillFormData {
  name: string;
  color: string;
  icon?: string;
  /** true = не показувати в колі дерева прокачки */
  isEnableInSkillTree?: boolean;
}
