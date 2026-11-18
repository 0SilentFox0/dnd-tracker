import type { MainSkillRole } from '@/lib/constants/main-skills';

export interface MainSkill {
    id: string;
    campaignId: string;
    name: string;
    color: string;
    icon?: string | null;
    isEnableInSkillTree?: boolean;
    spellGroupId?: string | null;
    role?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface MainSkillFormData {
    name: string;
    color: string;
    icon?: string;
    isEnableInSkillTree?: boolean;
    spellGroupId?: string | null;
    role?: MainSkillRole | null;
}
