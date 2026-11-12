import { DMFeatsPageClient } from './page-client';

import { requireCampaignDMOrDemo } from '@/lib/server/campaigns/access';

export default async function DMFeatsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const { isDemo } = await requireCampaignDMOrDemo(id);

    return <DMFeatsPageClient campaignId={id} canEdit={!isDemo} />;
}
