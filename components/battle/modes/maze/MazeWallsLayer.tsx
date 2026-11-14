'use client';

import { memo } from 'react';

import { edgeRect } from '@/components/battle/map/edge-geometry';
import { EDGE_WALL_WIDTH } from '@/lib/constants/battle';
import { UNIT } from '@/lib/utils/battle/grid';
import type { MazeView } from '@/lib/utils/battle/modes/maze';
import type { BattleMapConfig } from '@/types/battle';

const HALF = EDGE_WALL_WIDTH / 2;

interface Props {
    map: BattleMapConfig;
    view: MazeView | null | undefined;
}

export const MazeWallsLayer = memo(function MazeWallsLayer({
    map,
    view,
}: Props) {
    const walls = map.maze?.walls;

    if (!walls) return null;

    const shown = view ? walls.filter(view.showWalls) : walls;

    return (
        <g pointerEvents="none" data-maze-walls="">
            <rect
                className="maze-frame"
                data-maze-frame=""
                x={0}
                y={0}
                width={map.cols * UNIT}
                height={map.rows * UNIT}
                strokeWidth={EDGE_WALL_WIDTH * 2}
            />
            {shown.map((edge) => (
                <rect
                    key={edge}
                    className="maze-wall"
                    data-maze-wall={edge}
                    {...edgeRect(edge)}
                    rx={HALF}
                    ry={HALF}
                />
            ))}
        </g>
    );
});
