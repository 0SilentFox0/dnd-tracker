import { BattlePageClient } from './page-client';

import { PlayerViewGuard } from '@/components/common/PlayerViewGuard';
import { getSessionUserId } from '@/lib/auth';
import { battleMapKeys } from '@/lib/hooks/battle-maps';
import { battleQueryKey } from '@/lib/hooks/battles';
import { PrefetchedQuery } from '@/lib/providers/prefetched-query';
import { getMap } from '@/lib/server/battle-maps/library-service';
import { getTileChunks } from '@/lib/server/battle-maps/tiles-service';
import { readBattleScene } from '@/lib/server/battles/read-battle';
import { requireCampaignMember } from '@/lib/server/campaigns/access';
import { readOkJson } from '@/lib/utils/api/read-json';
import type { BattleScene } from '@/types/api';

export default async function BattlePage({
    params,
}: {
    params: Promise<{ id: string; battleId: string }>;
}) {
    const { id, battleId } = await params;

    const [userId, , battle] = await Promise.all([
        getSessionUserId(),
        requireCampaignMember(id),
        readBattleScene({ id, battleId }).then((res) =>
            readOkJson<BattleScene>(res)
        ),
    ]);

    const ref = battle?.mapRef;

    const pinned = ref
        ? await getMap(ref.mapId, ref.version).catch(() => null)
        : null;

    const tileChunks = ref && pinned?.campaignId === id
        ? await getTileChunks(ref.mapId, ref.version).catch(() => null)
        : null;

    const edges =
        ref && pinned?.campaignId === id
            ? { walls: pinned.walls, bars: pinned.bars }
            : null;

    const client = (
        <PlayerViewGuard scope={{ kind: 'battle', id: battleId }}>
            <BattlePageClient
                campaignId={id}
                battleId={battleId}
                userId={userId}
            />
        </PlayerViewGuard>
    );

    return (
        <PrefetchedQuery queryKey={battleQueryKey(id, battleId)} data={battle}>
            {ref && edges ? (
                <PrefetchedQuery
                    queryKey={battleMapKeys.edges(id, ref)}
                    data={edges}
                >
                    {tileChunks ? (
                        <PrefetchedQuery
                            queryKey={battleMapKeys.tiles(id, ref.mapId, ref.version)}
                            data={{ version: ref.version, chunks: tileChunks }}
                        >
                            {client}
                        </PrefetchedQuery>
                    ) : client}
                </PrefetchedQuery>
            ) : (
                client
            )}
        </PrefetchedQuery>
    );
}
