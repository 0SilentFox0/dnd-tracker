import { SystemDmPage } from '@/components/systems/SystemDmPage';
import { artifactSetKeys } from '@/lib/hooks/artifact-sets/keys';
import { PrefetchedQuery } from '@/lib/providers/prefetched-query';
import { readArtifactSets } from '@/lib/server/artifacts/read-artifact-sets';
import { requireCampaignDM } from '@/lib/server/campaigns/access';
import { readOkJson } from '@/lib/utils/api/read-json';
import { parseRules } from '@/lib/utils/rules/schema';
import type { ArtifactSetRow } from '@/types/artifact-sets';

export default async function DMArtifactSetsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const { campaign } = await requireCampaignDM(id);

    const sets = await readOkJson<ArtifactSetRow[]>(
        await readArtifactSets({ id, accessChecked: true })
    );

    return (
        <PrefetchedQuery queryKey={artifactSetKeys.list(id)} data={sets}>
            <SystemDmPage
                campaignId={id}
                section="artifact-sets"
                system={parseRules(campaign.rules).system}
                canEdit
            />
        </PrefetchedQuery>
    );
}
