import { useState } from 'react';

import { moveRoutes, type RoutePoint } from '@/lib/utils/battle/grid';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

const NONE: ReadonlyMap<string, RoutePoint[]> = new Map();

/** Маршрути жетонів, що змінили клітинку з попереднього знімка учасників. */
export function useMoveRoutes(
    map: BattleMapConfig,
    participants: BattleParticipant[]
): ReadonlyMap<string, RoutePoint[]> {
    const [seen, setSeen] = useState({ participants, routes: NONE });

    if (seen.participants !== participants) {
        setSeen({
            participants,
            routes: moveRoutes(map, seen.participants, participants),
        });
    }

    return seen.routes;
}
