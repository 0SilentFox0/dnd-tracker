'use client';

import { memo } from 'react';

import { useTranslations } from 'next-intl';

import { useCoarsePointer } from '@/lib/hooks/common';
import { cellCenter, UNIT } from '@/lib/utils/battle/grid';
import type { PathPreview } from '@/types/battle-grid';

interface MapPathPreviewProps {
    preview: PathPreview | null | undefined;
}

export const MapPathPreview = memo(function MapPathPreview({
    preview,
}: MapPathPreviewProps) {
    const t = useTranslations('battle.map');

    const coarse = useCoarsePointer();

    if (!preview || coarse) return null;

    const points = [preview.from, ...preview.path].map(cellCenter);

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
                r={UNIT * 0.12}
                className="battle-map-path-dot"
            />
            <text
                data-path-cost=""
                x={end.x}
                y={end.y - UNIT * 0.5}
                textAnchor="middle"
                fontSize={UNIT * 0.26}
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
