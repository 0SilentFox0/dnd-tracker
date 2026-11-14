import { MainSkillEditForm } from './main-skills/MainSkillEditForm';
import { MainSkillsList } from './main-skills/MainSkillsList';

import type { DmPageProps } from '@/components/systems/types';
import type { MainSkill } from '@/types/main-skills';

export function MainSkillsPage({ campaignId, view, data }: DmPageProps) {
    if (view?.type === 'edit')
        return (
            <MainSkillEditForm
                campaignId={campaignId}
                mainSkill={data as MainSkill}
            />
        );

    return (
        <MainSkillsList
            campaignId={campaignId}
            initialMainSkills={data as MainSkill[]}
        />
    );
}
