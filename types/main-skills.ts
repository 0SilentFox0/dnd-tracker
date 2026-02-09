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
  /** ID групи заклинань, пов'язаної з цією основною навичкою (школа магії) */
  spellGroupId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MainSkillFormData {
  name: string;
  color: string;
  icon?: string;
  /** true = не показувати в колі дерева прокачки */
  isEnableInSkillTree?: boolean;
  /** ID групи заклинань (школа магії) */
  spellGroupId?: string | null;
}
