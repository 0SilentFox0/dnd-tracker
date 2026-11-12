import { notFound } from 'next/navigation';

import { DMCareersPageClient } from './careers-client';

import { requireCampaignDMOrDemo } from '@/lib/server/campaigns/access';
import { parseRules } from '@/lib/utils/rules/schema';
import { metaOf } from '@/lib/utils/rules/systems/meta';

export default async function DMCareersPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const { campaign, isDemo } = await requireCampaignDMOrDemo(id);

    const systemKey = parseRules(campaign.rules).system.key;

    if (!metaOf(systemKey)?.dmSections?.includes('careers')) notFound();

    return (
        <DMCareersPageClient
            campaignId={id}
            systemKey={systemKey}
            canEdit={!isDemo}
        />
    );
}
