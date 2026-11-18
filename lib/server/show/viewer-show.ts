import 'server-only';
import { activePlayerHeroes } from '@/lib/server/world/travel-store';
import type { CampaignAccessResult } from '@/lib/utils/api/api-auth';
import {
    isRestricted,
    playerShowView,
    toClientShow,
} from '@/lib/utils/show/player-view';
import type { ShowState } from '@/types/show';

/** The DM sees everything, a player only slides for their heroes; `trail` goes to nobody. */
export async function showForViewer(
    campaignId: string,
    access: Pick<CampaignAccessResult, 'userId' | 'isDM'>,
    show: ShowState | null
): Promise<ShowState | null> {
    if (!show) return null;

    if (access.isDM || !isRestricted(show)) return toClientShow(show);

    const heroes = await activePlayerHeroes(campaignId, {
        controlledBy: access.userId,
    });

    return playerShowView(
        show,
        heroes.map((h) => h.id)
    );
}
