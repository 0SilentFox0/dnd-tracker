'use client';

import { memo } from 'react';

import { PULSE_STEP_MS, STROKE_COLORS, TEMPLATE_COLORS } from './constants';

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
                    fill={STROKE_COLORS.pendingFill}
                    stroke={STROKE_COLORS.stroke}
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
                    fill={STROKE_COLORS.fill}
                    stroke={STROKE_COLORS.stroke}
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                />
            ))}
        </g>
    );
});

const pulseStep = (from: GridPoint | null | undefined, p: GridPoint) =>
    from ? cellDistance(from, p) : 0;

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

    // a new key on point change restarts the animation of all cells together, not just the new ones
    return (
        <g key={wave} data-template-layer={wave} pointerEvents="none">
            {cells.map((k) => (
                <polygon
                    key={`tp${k}`}
                    data-template-cell={k}
                    {...pulse(parseCellKey(k))}
                    points={cellPolygon(parseCellKey(k))}
                    fill={TEMPLATE_COLORS.fill}
                    stroke={TEMPLATE_COLORS.stroke}
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                />
            ))}
            {aim && (
                <polygon
                    data-template-aim={cellKey(aim)}
                    {...pulse(aim)}
                    points={cellPolygon(aim)}
                    fill={TEMPLATE_COLORS.aimFill}
                    stroke={TEMPLATE_COLORS.aimStroke}
                    strokeWidth={3}
                    vectorEffect="non-scaling-stroke"
                />
            )}
        </g>
    );
});
