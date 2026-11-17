import { cellKey } from './geometry';
import { tokenBox } from './layout';
import { pathTo } from './path';

import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

export interface RoutePoint {
    cx: number;
    cy: number;
}

const SEARCH_BUDGET = 200;

/** Центри жетона вздовж ходу від старої клітинки до нової; шлях обходить стіни, інакше — пряма. */
export function moveRoutes(
    map: BattleMapConfig,
    prev: readonly BattleParticipant[],
    next: readonly BattleParticipant[]
): Map<string, RoutePoint[]> {
    const routes = new Map<string, RoutePoint[]>();

    const before = new Map(prev.map((p) => [p.basicInfo.id, p]));

    for (const p of next) {
        const old = before.get(p.basicInfo.id);

        const from = old?.battleData.position;

        const to = p.battleData.position;

        if (!old || !from || !to || cellKey(from) === cellKey(to)) continue;

        const cells =
            pathTo(map, [...prev], old, to, SEARCH_BUDGET) ?? ([to] as const);

        const points = [from, ...cells].flatMap((anchor) => {
            const box = tokenBox({
                ...p,
                battleData: { ...p.battleData, position: anchor },
            });

            return box ? [{ cx: box.cx, cy: box.cy }] : [];
        });

        if (points.length > 1) routes.set(p.basicInfo.id, points);
    }

    return routes;
}
