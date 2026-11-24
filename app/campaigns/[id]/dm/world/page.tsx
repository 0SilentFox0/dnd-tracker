import { WorldEditorPageClient } from './page-client';

import { CampaignGameShell } from '@/app/campaigns/[id]/campaign-game-shell';
import { prisma } from '@/lib/db';
import { worldKeys } from '@/lib/hooks/world';
import { PrefetchedQuery } from '@/lib/providers/prefetched-query';
import { requireCampaignDM } from '@/lib/server/campaigns/access';
import {
    getWorldMapHandler,
    listWorldMapsHandler,
} from '@/lib/server/world/map-handlers';
import { readOkJson } from '@/lib/utils/api/read-json';
import type { WorldMapDetail, WorldMapSummary } from '@/types/world';

export default async function DMWorldPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ map?: string; marker?: string }>;
}) {
    const [{ id }, { map, marker }] = await Promise.all([params, searchParams]);

    const { campaign, userId } = await requireCampaignDM(id);

    const [maps, linked] = await Promise.all([
        listWorldMapsHandler(id).then((res) =>
            readOkJson<WorldMapSummary[]>(res)
        ),
        marker
            ? prisma.worldMarker.findFirst({
                  where: { id: marker, map: { campaignId: id } },
                  select: { mapId: true },
              })
            : null,
    ]);

    const mapId =
        linked?.mapId ??
        (map && maps?.some((m) => m.id === map) ? map : undefined) ??
        maps?.find((m) => !m.parentMarkerId)?.id ??
        null;

    const detail = mapId
        ? await readOkJson<WorldMapDetail>(await getWorldMapHandler(id, mapId))
        : null;

    const client = (
        <WorldEditorPageClient
            campaignId={id}
            campaignName={campaign.name}
            mapId={mapId}
            initialSelectedId={linked?.mapId === mapId ? marker : undefined}
        />
    );

    return (
        <CampaignGameShell campaign={campaign} viewer={{ isDM: true, userId }} active="world" hasWorld>
            {maps ? (
                <PrefetchedQuery queryKey={worldKeys.maps(id)} data={maps}>
                    {mapId && detail ? (
                        <PrefetchedQuery queryKey={worldKeys.map(id, mapId)} data={detail}>
                            {client}
                        </PrefetchedQuery>
                    ) : client}
                </PrefetchedQuery>
            ) : client}
        </CampaignGameShell>
    );
}
