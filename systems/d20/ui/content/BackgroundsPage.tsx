import { BackgroundForm } from './backgrounds/BackgroundForm';
import { BackgroundsList } from './backgrounds/BackgroundsList';

import type { DmPageProps } from '@/components/systems/types';
import type { BackgroundData } from '@/types/backgrounds';

export function BackgroundsPage({
    campaignId,
    canEdit,
    view,
    data,
}: DmPageProps) {
    if (view?.type === 'edit')
        return (
            <BackgroundForm
                campaignId={campaignId}
                background={data as BackgroundData}
            />
        );

    return <BackgroundsList campaignId={campaignId} canEdit={canEdit} />;
}
