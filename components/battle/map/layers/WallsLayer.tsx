'use client';

import { memo } from 'react';

import { edgeRect } from './edge-geometry';

import { parseEdgeKey, UNIT } from '@/lib/utils/battle/grid';
import type { BattleMapConfig } from '@/types/battle-grid';

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

const BRICKS_ROW_A = [0.5, 20.5];

const BRICKS_ROW_B = [10.5, 30.5, -9.5];

function BrickPattern({ id, rotate }: { id: string; rotate?: boolean }) {
    return (
        <pattern
            id={id}
            width="40"
            height="10"
            patternUnits="userSpaceOnUse"
            patternTransform={rotate ? 'rotate(90)' : undefined}
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

function wallSide(edge: string) {
    return parseEdgeKey(edge).side;
}

export const WallsLayer = memo(function WallsLayer({
    map,
    ghost,
}: {
    map: Pick<BattleMapConfig, 'walls' | 'bars'>;
    ghost?: ReadonlySet<string>;
}) {
    const { walls, bars } = map;

    if (!walls?.length && !bars?.length && !ghost?.size) return null;

    return (
        <g pointerEvents="none" data-map-edges="">
            <defs>
                <BrickPattern id="map-wall-brick-h" />
                <BrickPattern id="map-wall-brick-v" rotate />
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
                    {walls.map((edge) => {
                        const r = edgeRect(edge);

                        return (
                            <rect
                                key={edge}
                                x={r.x + 3}
                                y={r.y + 5}
                                width={r.width}
                                height={r.height}
                                fill="#000"
                            />
                        );
                    })}
                </g>
            )}
            {ghost &&
                [...ghost].map((edge) => (
                    <rect
                        key={`g${edge}`}
                        data-map-ghost={edge}
                        className="map-edge-ghost"
                        {...edgeRect(edge)}
                        rx={2}
                        ry={2}
                    />
                ))}
            {bars?.map((edge) => (
                <line
                    key={edge}
                    className="map-bars"
                    data-map-bars={edge}
                    {...barsLine(edge)}
                />
            ))}
            {walls?.map((edge) => {
                const side = wallSide(edge);

                return (
                    <g key={edge}>
                        <rect
                            className="map-wall"
                            data-map-wall={edge}
                            fill={`url(#map-wall-brick-${side === 'e' ? 'v' : 'h'})`}
                            {...edgeRect(edge)}
                            rx={2}
                            ry={2}
                        />
                        <rect
                            className="map-wall-light"
                            {...edgeRect(edge, 2)}
                            {...(side === 'e'
                                ? { x: edgeRect(edge).x + 1 }
                                : { y: edgeRect(edge).y + 1 })}
                        />
                    </g>
                );
            })}
        </g>
    );
});
