import { EditSkillClient } from './skills/EditSkill';
import { SkillCreateForm } from './skills/form/SkillCreateForm';
import { SkillsList } from './skills/SkillsList';

import type { DmPageProps } from '@/components/systems/types';
import type { IdName } from '@/types/common';
import type { MainSkill } from '@/types/main-skills';

export interface SkillFormData {
    spells: IdName[];
    mainSkills: MainSkill[];
}

export function SkillsPage({ campaignId, canEdit, view, data }: DmPageProps) {
    const form = data as SkillFormData;

    if (view?.type === 'new')
        return <SkillCreateForm campaignId={campaignId} spells={form.spells} />;

    if (view?.type === 'edit')
        return (
            <EditSkillClient
                campaignId={campaignId}
                skillId={view.id}
                spells={form.spells}
                initialMainSkills={form.mainSkills}
            />
        );

    return <SkillsList campaignId={campaignId} canEdit={canEdit} />;
}
