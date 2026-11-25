'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';

import { useCoarsePointer } from '@/lib/hooks/common';
import { cellCenter, unitOf } from '@/lib/utils/battle/grid';
import type { GridKind, PathPreview } from '@/types/battle-grid';

interface MapPathPreviewProps {
    preview: PathPreview | null | undefined;
    grid: GridKind;
}

export const MapPathPreview = memo(function MapPathPreview({
    preview,
    grid,
}: MapPathPreviewProps) {
    const t = useTranslations('battle.map');

    const coarse = useCoarsePointer();

    if (!preview || coarse) return null;

    const points = [preview.from, ...preview.path].map((c) =>
        cellCenter(c, grid)
    );

    const end = points[points.length - 1];

    return (
        <g
            className="battle-map-path-preview"
            data-path-preview=""
            pointerEvents="none"
        >
            <polyline
                points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                className="battle-map-path-line"
            />
            <circle
                cx={end.x}
                cy={end.y}
                r={unitOf(0.12)}
                className="battle-map-path-dot"
            />
            <text
                data-path-cost=""
                x={end.x}
                y={end.y - unitOf(0.5)}
                textAnchor="middle"
                fontSize={unitOf(0.26)}
                fontWeight={700}
                className="battle-map-path-label"
            >
                {t('pathCost', {
                    metres: preview.metres,
                    feet: preview.feet,
                })}
            </text>
        </g>
    );
});
