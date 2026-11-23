import { redirect } from 'next/navigation';

import { GameWorldShell } from './game-world-shell';
import { WorldPageClient } from './page-client';

import { ErrorState } from '@/components/common/states';
import { worldKeys } from '@/lib/hooks/world';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { getTranslator } from '@/lib/i18n/translator';
import { PrefetchedQuery } from '@/lib/providers/prefetched-query';
import { requireCampaignMember } from '@/lib/server/campaigns/access';
import { viewHandler } from '@/lib/server/world/view-handlers';
import { readOkJson } from '@/lib/utils/api/read-json';
import type { WorldView } from '@/types/world';

type ViewResult = { view: WorldView | null; failed: boolean };

async function readView(
    campaignId: string,
    mapId?: string
): Promise<ViewResult> {
    const res = await viewHandler(
        new Request(
            `http://localhost/world/view${mapId ? `?mapId=${encodeURIComponent(mapId)}` : ''}`
        ),
        campaignId
    );

    return {
        view: await readOkJson<WorldView>(res),
        failed: !res.ok && res.status !== 404,
    };
}

export default async function WorldPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ map?: string }>;
}) {
    const [{ id }, { map }] = await Promise.all([params, searchParams]);

    const { campaign, isDM, userId } = await requireCampaignMember(id);

    if (isDM) redirect(`/campaigns/${id}/dm/world`);

    // a map the player may not open falls back to their current one
    const first = map ? await readView(id, map) : null;

    const { view, failed } = first?.view ? first : await readView(id);

    if (failed)
        return (
            <GameWorldShell campaign={campaign} viewer={{ isDM, userId }}>
                <ErrorState
                    error={(await getTranslator(await getRequestLocale(), 'world'))(
                        'play.loadFailed'
                    )}
                    className="m-4"
                />
            </GameWorldShell>
        );

    const client = (
        <WorldPageClient
            campaignId={id}
            campaignName={campaign.name}
            mapId={view?.map.id ?? null}
        />
    );

    return (
        <GameWorldShell campaign={campaign} viewer={{ isDM, userId }}>
            {view ? (
                <PrefetchedQuery queryKey={worldKeys.view(id, view.map.id)} data={view}>
                    {client}
                </PrefetchedQuery>
            ) : client}
        </GameWorldShell>
    );
}
