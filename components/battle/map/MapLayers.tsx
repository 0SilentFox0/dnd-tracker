'use client';

import { memo } from 'react';

import { PULSE_STEP_MS } from './constants';

import {
    cellDistance,
    cellKey,
    cellPolygon,
    parseCellKey,
} from '@/lib/utils/battle/grid';
import type { BattleMapView, GridPoint } from '@/types/battle-grid';

export const StrokeLayer = memo(function StrokeLayer({
    preview,
    pending,
}: {
    preview: ReadonlySet<string>;
    pending?: ReadonlySet<string>;
}) {
    const sent = pending ? [...pending].filter((k) => !preview.has(k)) : [];

    return (
        <g pointerEvents="none">
            {sent.map((k) => (
                <polygon
                    key={`p${k}`}
                    data-stroke-pending={k}
                    points={cellPolygon(parseCellKey(k))}
                    fill="rgba(242,193,78,.22)"
                    stroke="#f2c14e"
                    strokeOpacity={0.6}
                    strokeWidth={1.5}
                    strokeDasharray="6 4"
                    vectorEffect="non-scaling-stroke"
                />
            ))}
            {[...preview].map((k) => (
                <polygon
                    key={`s${k}`}
                    data-stroke={k}
                    points={cellPolygon(parseCellKey(k))}
                    fill="rgba(242,193,78,.35)"
                    stroke="#f2c14e"
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                />
            ))}
        </g>
    );
});

const pulseStep = (from: GridPoint | null | undefined, p: GridPoint) =>
    from ? cellDistance(from, p) : 0;

/** Хвиля від центру (або вершини конуса/лінії) до країв: затримка анімації росте з відстанню клітинки. */
export const TemplateLayer = memo(function TemplateLayer({
    marks,
    aim,
    pulseFrom,
}: Pick<BattleMapView, 'marks' | 'aim' | 'pulseFrom'>) {
    const cells = marks
        ? [...marks].flatMap(([k, m]) => (m === 'template' ? [k] : []))
        : [];

    if (cells.length === 0 && !aim) return null;

    const pulse = (p: GridPoint) => {
        const step = pulseStep(pulseFrom, p);

        return {
            'data-pulse-step': step,
            className: 'battle-map-pulse',
            style: { animationDelay: `${step * PULSE_STEP_MS}ms` },
        };
    };

    const wave = `${pulseFrom ? cellKey(pulseFrom) : ''}/${aim ? cellKey(aim) : ''}`;

    // новий ключ при зміні точки перезапускає анімацію всіх клітинок разом, а не лише нових
    return (
        <g key={wave} data-template-layer={wave} pointerEvents="none">
            {cells.map((k) => (
                <polygon
                    key={`tp${k}`}
                    data-template-cell={k}
                    {...pulse(parseCellKey(k))}
                    points={cellPolygon(parseCellKey(k))}
                    fill="rgba(168,120,255,.3)"
                    stroke="#c4a6ff"
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                />
            ))}
            {aim && (
                <polygon
                    data-template-aim={cellKey(aim)}
                    {...pulse(aim)}
                    points={cellPolygon(aim)}
                    fill="rgba(200,176,255,.5)"
                    stroke="#efe6ff"
                    strokeWidth={3}
                    vectorEffect="non-scaling-stroke"
                />
            )}
        </g>
    );
});
