import { ClassesList } from './classes/ClassesList';
import { ClassForm } from './classes/ClassForm';

import type { DmPageProps } from '@/components/systems/types';
import type { GameClassData } from '@/types/classes';

export function ClassesPage({ campaignId, canEdit, view, data }: DmPageProps) {
    if (view?.type === 'edit')
        return (
            <ClassForm
                campaignId={campaignId}
                gameClass={data as GameClassData}
            />
        );

    return <ClassesList campaignId={campaignId} canEdit={canEdit} />;
}
