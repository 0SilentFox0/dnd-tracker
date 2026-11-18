import { DMArtifactsPageClient } from './page-client';

import { artifactKeys } from '@/lib/hooks/artifacts';
import { PrefetchedQuery } from '@/lib/providers/prefetched-query';
import { readArtifacts } from '@/lib/server/artifacts/read-artifacts';
import { requireCampaignDMOrDemo } from '@/lib/server/campaigns/access';
import { readOkJson } from '@/lib/utils/api/read-json';
import { parseRules } from '@/lib/utils/rules/schema';
import type { ArtifactListItem } from '@/types/artifacts';

export default async function DMArtifactsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const { campaign, isDemo } = await requireCampaignDMOrDemo(id);

    const artifacts = await readArtifacts({ id, accessChecked: true }).then(
        (res) => readOkJson<ArtifactListItem[]>(res)
    );

    return (
        <PrefetchedQuery queryKey={artifactKeys.list(id)} data={artifacts}>
            <DMArtifactsPageClient
                campaignId={id}
                system={parseRules(campaign.rules).system}
                canEdit={!isDemo}
            />
        </PrefetchedQuery>
    );
}
