import { BattlePageClient } from './BattlePageClient';

import { PlayerViewGuard } from '@/components/common/PlayerViewGuard';
import { getSessionUserId } from '@/lib/auth';
import { battleQueryKey } from '@/lib/hooks/battles/keys';
import { PrefetchedQuery } from '@/lib/providers/prefetched-query';
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

    return (
        <PrefetchedQuery queryKey={battleQueryKey(id, battleId)} data={battle}>
            <PlayerViewGuard scope={{ kind: 'battle', id: battleId }}>
                <BattlePageClient
                    campaignId={id}
                    battleId={battleId}
                    userId={userId}
                />
            </PlayerViewGuard>
        </PrefetchedQuery>
    );
}
