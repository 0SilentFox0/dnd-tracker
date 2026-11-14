'use client';

import { memo } from 'react';

import { edgeRect } from './edge-geometry';

import { type EdgeEditing, useEdgeStroke } from '@/lib/hooks/battle';
import { mapSize } from '@/lib/utils/battle/grid';
import type { BattleMapConfig } from '@/types/battle';

interface Props {
    map: Pick<BattleMapConfig, 'cols' | 'rows'>;
    editing: EdgeEditing;
}

/** Один прозорий шар на всю карту: ребро знаходиться за координатою вказівника, а не окремим елементом на ребро. */
export const EdgeEditor = memo(function EdgeEditor({ map, editing }: Props) {
    const { cols, rows } = map;

    const { handlers, pending, remove } = useEdgeStroke(
        { cols, rows },
        editing
    );

    const { width, height } = mapSize({ cols, rows });

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
                            {...edgeRect(edge)}
                            rx={3}
                            className="map-edge-pending"
                        />
                    ))}
                    {[...editing.committed.remove].map((edge) => (
                        <rect
                            key={`r${edge}`}
                            data-edge-committed={edge}
                            {...edgeRect(edge)}
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
                            {...edgeRect(edge)}
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
