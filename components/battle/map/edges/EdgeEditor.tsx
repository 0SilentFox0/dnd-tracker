'use client';

import { memo } from 'react';

import { edgeBar, edgeBarProps } from './edge-geometry';

import { EDGE_WALL_WIDTH } from '@/lib/constants/battle';
import { type EdgeEditing, useEdgeStroke } from '@/lib/hooks/battle';
import { gridOf, mapSize } from '@/lib/utils/battle/grid';
import type { BattleMapConfig } from '@/types/battle-grid';

interface Props {
    map: Pick<BattleMapConfig, 'cols' | 'rows' | 'gridType'>;
    editing: EdgeEditing;
}

export const EdgeEditor = memo(function EdgeEditor({ map, editing }: Props) {
    const { cols, rows, gridType } = map;

    const grid = gridOf(map);

    const bar = (edge: string) =>
        edgeBarProps(edgeBar(grid, edge), EDGE_WALL_WIDTH);

    const { handlers, pending, remove } = useEdgeStroke(
        { cols, rows, gridType },
        editing
    );

    const { width, height } = mapSize({ cols, rows }, grid);

    return (
        <g data-edge-editor="">
            <rect
                data-edge-surface=""
                x={0}
                y={0}
                width={width}
                height={height}
                fill="transparent"
                style={{ cursor: 'crosshair', touchAction: 'none' }}
                {...handlers}
            />
            {editing.committed && (
                <g pointerEvents="none">
                    {[...editing.committed.add].map((edge) => (
                        <rect
                            key={`a${edge}`}
                            data-edge-committed={edge}
                            {...bar(edge)}
                            rx={3}
                            className="map-edge-pending"
                        />
                    ))}
                    {[...editing.committed.remove].map((edge) => (
                        <rect
                            key={`r${edge}`}
                            data-edge-committed={edge}
                            {...bar(edge)}
                            rx={3}
                            className="map-edge-pending-remove"
                        />
                    ))}
                </g>
            )}
            {pending.size > 0 && (
                <g pointerEvents="none">
                    {[...pending].map((edge) => (
                        <rect
                            key={edge}
                            data-edge-pending={edge}
                            {...bar(edge)}
                            rx={3}
                            className={
                                remove
                                    ? 'map-edge-pending-remove'
                                    : 'map-edge-pending'
                            }
                        />
                    ))}
                </g>
            )}
        </g>
    );
});
