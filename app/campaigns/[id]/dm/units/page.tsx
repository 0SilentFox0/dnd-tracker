import { DMUnitsPageClient } from './page-client';

import { getCachedUnits } from '@/lib/cache/reference-data';
import { requireCampaignDMOrDemo } from '@/lib/server/campaigns/access';

export default async function DMUnitsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const { isDemo } = await requireCampaignDMOrDemo(id);

    return (
        <DMUnitsPageClient
            campaignId={id}
            initialUnits={await getCachedUnits(id)}
            canEdit={!isDemo}
        />
    );
}
