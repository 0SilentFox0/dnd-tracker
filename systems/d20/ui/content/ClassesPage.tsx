import { ClassesList } from './classes/ClassesList';
import { ClassForm } from './classes/ClassForm';

import type { DmPageProps } from '@/components/systems/types';
import type { GameClassData } from '@/types/classes';

export function ClassesPage({ campaignId, canEdit, view, data, side }: DmPageProps) {
    if (view?.type === 'edit')
        return (
            <ClassForm
                campaignId={campaignId}
                gameClass={data as GameClassData}
                side={side}
            />
        );

    return <ClassesList campaignId={campaignId} canEdit={canEdit} />;
}
