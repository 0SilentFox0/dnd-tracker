import { listLayerInputs } from '@/lib/server/world/layer-store';
import { readWorldMapDetail } from '@/lib/server/world/map-store';
import { activePlayerHeroes } from '@/lib/server/world/travel-store';
import { readViewerScope } from '@/lib/server/world/view-handlers';
import { visibleMarkerIds } from '@/lib/utils/world/player-view';

export async function questVisibleMarkers(
    campaignId: string,
    userId: string,
    mapIds: string[]
) {
    const result = new Set<string>();

    if (!mapIds.length) return result;

    const heroIds = (
        await activePlayerHeroes(campaignId, { controlledBy: userId })
    ).map((h) => h.id);

    const { reveals, allowed } = await readViewerScope(campaignId, heroIds);

    await Promise.all(
        [...new Set(mapIds)]
            .filter((id) => allowed.has(id))
            .map(async (id) => {
                const [detail, layers] = await Promise.all([
                    readWorldMapDetail(id),
                    listLayerInputs(id),
                ]);

                if (!detail) return;

                for (const markerId of visibleMarkerIds({
                    map: detail.map,
                    markers: detail.markers,
                    layers,
                    reveals,
                    viewer: { userId, heroIds },
                }))
                    result.add(markerId);
            })
    );

    return result;
}
