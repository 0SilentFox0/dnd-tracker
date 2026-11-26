'use client';

import { useTranslations } from 'next-intl';
import { Grid3x3, Swords } from 'lucide-react';

import { OptimizedImage } from '@/components/common/entity/OptimizedImage';
import { cn } from '@/lib/utils';
import type { BattleListMap } from '@/types/battle';

const SIZE = {
    card: 'aspect-[16/9] w-full',
    row: 'size-12 shrink-0 rounded-lg',
    banner: 'size-full min-h-32',
    tile: 'aspect-[4/3] w-full',
} as const;

const HEX_H = Math.sqrt(3);

function GridOverlay({ map }: { map: BattleListMap }) {
    if (map.gridType === 'hex') {
        return (
            <svg
                aria-hidden
                className="absolute inset-0 size-full text-white/25"
                viewBox={`0 0 ${map.cols * 1.5} ${map.rows * HEX_H}`}
                preserveAspectRatio="none"
            >
                <defs>
                    <pattern
                        id="battle-thumb-hex"
                        width="3"
                        height={HEX_H}
                        patternUnits="userSpaceOnUse"
                    >
                        <path
                            d={`M0.5 0 L1.5 0 L2 ${HEX_H / 2} L1.5 ${HEX_H} L0.5 ${HEX_H} L0 ${HEX_H / 2} Z`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="0.06"
                        />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#battle-thumb-hex)" />
            </svg>
        );
    }

    return (
        <div
            aria-hidden
            className="absolute inset-0"
            style={{
                backgroundImage:
                    'linear-gradient(to right, rgb(255 255 255 / 0.22) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.22) 1px, transparent 1px)',
                backgroundSize: `${100 / map.cols}% ${100 / map.rows}%`,
            }}
        />
    );
}

export function BattleMapThumb({
    map,
    size,
}: {
    map: BattleListMap | null;
    size: keyof typeof SIZE;
}) {
    const t = useTranslations('battleSetup.list.card');

    const box = cn(
        'ds-inset relative flex items-center justify-center overflow-hidden text-hud-muted',
        SIZE[size]
    );

    if (!map) {
        return (
            <div data-slot="battle-map-thumb" data-empty="map" className={box}>
                <span className="flex flex-col items-center gap-1 text-xs">
                    <Swords className="size-5" aria-hidden />
                    {size !== 'row' && t('noMap')}
                </span>
            </div>
        );
    }

    if (!map.background) {
        return (
            <div
                data-slot="battle-map-thumb"
                data-empty="background"
                className={box}
            >
                <Grid3x3 className="size-5" aria-hidden />
            </div>
        );
    }

    return (
        <div data-slot="battle-map-thumb" className={box}>
            <OptimizedImage
                src={map.background}
                alt=""
                width={size === 'row' ? 96 : 480}
                height={size === 'row' ? 96 : 300}
                className="size-full object-cover"
                fallback={<Grid3x3 className="size-5" aria-hidden />}
            />
            {size !== 'row' && <GridOverlay map={map} />}
        </div>
    );
}
