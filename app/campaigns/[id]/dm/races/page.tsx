import { DMRacesPageClient } from './page-client';

import { raceKeys } from '@/lib/hooks/races';
import { PrefetchedQuery } from '@/lib/providers/prefetched-query';
import { requireCampaignDMOrDemo } from '@/lib/server/campaigns/access';
import { readRaces } from '@/lib/server/races/read-races';
import { readOkJson } from '@/lib/utils/api/read-json';
import { parseRules } from '@/lib/utils/rules/schema';
import type { Race } from '@/types/races';

export default async function DMRacesPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const { campaign, isDemo } = await requireCampaignDMOrDemo(id);

    const races = await readOkJson<Race[]>(
        await readRaces({ id, accessChecked: true })
    );

    return (
        <PrefetchedQuery queryKey={raceKeys.list(id)} data={races}>
            <DMRacesPageClient
                campaignId={id}
                system={parseRules(campaign.rules).system}
                canEdit={!isDemo}
            />
        </PrefetchedQuery>
    );
}
