import {
    RANGED_HINT_DOT_RATIO,
    RANGED_HINT_LABEL_OFFSET_RATIO,
    RANGED_HINT_LABEL_SIZE_RATIO,
} from '../constants';

import {
    cellCenter,
    cellPolygon,
    parseCellKey,
    unitOf,
} from '@/lib/utils/battle/grid';
import type { BattleMapView, GridKind } from '@/types/battle-grid';

interface RangedHintProps {
    from: { cx: number; cy: number };
    grid: GridKind;
    trajectory: NonNullable<BattleMapView['trajectory']>;
}

export function RangedHint({ from, trajectory, grid }: RangedHintProps) {
    const end = cellCenter(trajectory.to, grid);

    const color = trajectory.cover ? '#e0603a' : '#f2c14e';

    return (
        <g pointerEvents="none">
            <line
                data-map-attack-hint="ranged"
                x1={from.cx}
                y1={from.cy}
                x2={end.x}
                y2={end.y}
                stroke={color}
                strokeWidth={4}
                strokeDasharray="12 10"
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
            />
            <circle
                cx={end.x}
                cy={end.y}
                r={unitOf(RANGED_HINT_DOT_RATIO)}
                fill={color}
            />
            {trajectory.cover?.map((key) => {
                const fill = 'rgba(224,96,58,.3)';

                if (grid === 'hex')
                    return (
                        <polygon
                            key={key}
                            points={cellPolygon(parseCellKey(key), grid)}
                            fill={fill}
                            stroke="#e0603a"
                            strokeWidth={2}
                            vectorEffect="non-scaling-stroke"
                        />
                    );

                const c = cellCenter(parseCellKey(key), grid);

                return (
                    <rect
                        key={key}
                        x={c.x - unitOf(0.5)}
                        y={c.y - unitOf(0.5)}
                        width={unitOf(1)}
                        height={unitOf(1)}
                        fill={fill}
                        stroke="#e0603a"
                        strokeWidth={2}
                        vectorEffect="non-scaling-stroke"
                    />
                );
            })}
            {trajectory.cover && (
                <text
                    x={end.x}
                    y={end.y - unitOf(RANGED_HINT_LABEL_OFFSET_RATIO)}
                    textAnchor="middle"
                    fontSize={unitOf(RANGED_HINT_LABEL_SIZE_RATIO)}
                    fontWeight={700}
                    fill="#ffd2b8"
                    stroke="#3a1a10"
                    strokeWidth={3}
                    paintOrder="stroke"
                >
                    🧱 ×0.5
                </text>
            )}
        </g>
    );
}
