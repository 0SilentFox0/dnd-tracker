'use client';

import { memo } from 'react';

import { edgeRect } from './edge-geometry';

import { EDGE_WALL_WIDTH } from '@/lib/constants/battle';
import { parseEdgeKey, UNIT } from '@/lib/utils/battle/grid';
import type { BattleMapConfig } from '@/types/battle';

function barsLine(edge: string) {
    const { a, side } = parseEdgeKey(edge);

    return side === 'e'
        ? {
              x1: (a.x + 1) * UNIT,
              y1: a.y * UNIT,
              x2: (a.x + 1) * UNIT,
              y2: (a.y + 1) * UNIT,
          }
        : {
              x1: a.x * UNIT,
              y1: (a.y + 1) * UNIT,
              x2: (a.x + 1) * UNIT,
              y2: (a.y + 1) * UNIT,
          };
}

export const WallsLayer = memo(function WallsLayer({
    map,
}: {
    map: Pick<BattleMapConfig, 'walls' | 'bars'>;
}) {
    const { walls, bars } = map;

    if (!walls?.length && !bars?.length) return null;

    return (
        <g pointerEvents="none" data-map-edges="">
            {bars?.map((edge) => (
                <line
                    key={edge}
                    className="map-bars"
                    data-map-bars={edge}
                    {...barsLine(edge)}
                />
            ))}
            {walls?.map((edge) => (
                <rect
                    key={edge}
                    className="map-wall"
                    data-map-wall={edge}
                    {...edgeRect(edge)}
                    rx={EDGE_WALL_WIDTH / 2}
                    ry={EDGE_WALL_WIDTH / 2}
                />
            ))}
        </g>
    );
});
