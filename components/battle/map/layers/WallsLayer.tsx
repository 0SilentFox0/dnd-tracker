'use client';

import { memo } from 'react';

import { edgeBar, edgeBarProps } from '../edges/edge-geometry';

import { EDGE_WALL_WIDTH } from '@/lib/constants/battle';
import { gridOf } from '@/lib/utils/battle/grid';
import { edgeSegment } from '@/lib/utils/battle/grid/edge-keys';
import type { BattleMapConfig } from '@/types/battle-grid';

const BRICKS_ROW_A = [0.5, 20.5];

const BRICKS_ROW_B = [10.5, 30.5, -9.5];

function BrickPattern({ id }: { id: string }) {
    return (
        <pattern
            id={id}
            width="40"
            height="10"
            patternUnits="userSpaceOnUse"
        >
            <rect
                width="40"
                height="10"
                fill="var(--map-wall-mortar, #2f2a25)"
            />
            {BRICKS_ROW_A.map((x, i) => (
                <rect
                    key={x}
                    x={x}
                    y="0.5"
                    width="19"
                    height="4"
                    fill={i ? '#7d7266' : '#8a7e71'}
                />
            ))}
            {BRICKS_ROW_B.map((x, i) => (
                <rect
                    key={x}
                    x={x}
                    y="5.5"
                    width="19"
                    height="4"
                    fill={i === 1 ? '#74695d' : '#857a6d'}
                />
            ))}
        </pattern>
    );
}

export const WallsLayer = memo(function WallsLayer({
    map,
    ghost,
}: {
    map: Pick<BattleMapConfig, 'walls' | 'bars' | 'gridType'>;
    ghost?: ReadonlySet<string>;
}) {
    const { walls, bars } = map;

    const grid = gridOf(map);

    if (!walls?.length && !bars?.length && !ghost?.size) return null;

    return (
        <g pointerEvents="none" data-map-edges="">
            <defs>
                <BrickPattern id="map-wall-brick" />
                <filter
                    id="map-wall-shadow"
                    x="-10%"
                    y="-10%"
                    width="120%"
                    height="120%"
                >
                    <feGaussianBlur stdDeviation="3" />
                </filter>
            </defs>
            {!!walls?.length && (
                <g filter="url(#map-wall-shadow)" opacity="0.55">
                    <g transform="translate(3 5)">
                        {walls.map((edge) => (
                            <rect
                                key={edge}
                                {...edgeBarProps(
                                    edgeBar(grid, edge),
                                    EDGE_WALL_WIDTH
                                )}
                                fill="#000"
                            />
                        ))}
                    </g>
                </g>
            )}
            {ghost &&
                [...ghost].map((edge) => (
                    <rect
                        key={`g${edge}`}
                        data-map-ghost={edge}
                        className="map-edge-ghost"
                        {...edgeBarProps(edgeBar(grid, edge), EDGE_WALL_WIDTH)}
                        rx={2}
                        ry={2}
                    />
                ))}
            {bars?.map((edge) => {
                const [p, q] = edgeSegment(grid, edge);

                return (
                    <line
                        key={edge}
                        className="map-bars"
                        data-map-bars={edge}
                        x1={p.x}
                        y1={p.y}
                        x2={q.x}
                        y2={q.y}
                    />
                );
            })}
            {walls?.map((edge) => {
                const props = edgeBarProps(edgeBar(grid, edge), EDGE_WALL_WIDTH);

                return (
                    <g key={edge}>
                        <rect
                            className="map-wall"
                            data-map-wall={edge}
                            fill="url(#map-wall-brick)"
                            {...props}
                            rx={2}
                            ry={2}
                        />
                        <rect
                            className="map-wall-light"
                            {...props}
                            y={-EDGE_WALL_WIDTH / 2 + 1}
                            height={2}
                        />
                    </g>
                );
            })}
        </g>
    );
});
