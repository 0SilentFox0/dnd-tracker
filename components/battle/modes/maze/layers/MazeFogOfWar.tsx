'use client';

import { memo, useEffect, useId, useMemo, useState } from 'react';

import { useFogQuality, useHydrated } from '@/lib/hooks/common';
import { parseCellKey, UNIT } from '@/lib/utils/battle/grid';
import { MazeView } from '@/lib/utils/battle/modes/maze';
import { cloudTextureUrl } from '@/lib/utils/canvas/fog/cloud-texture';
import { readFogPalette } from '@/lib/utils/canvas/fog/fog-palette';
import type { BattleMapConfig } from '@/types/battle-grid';

const DRIFT_SECONDS = 120;

const CLOUD_OVERSCAN = 1.3;

interface Props {
    map: BattleMapConfig;
    view: MazeView | null | undefined;
}

export const MazeFogOfWar = memo(function MazeFogOfWar({ map, view }: Props) {
    const id = `maze-fow-${useId().replace(/:/g, '')}`;

    const cells = view?.cells;

    const quality = useFogQuality();

    const hydrated = useHydrated();

    const [paletteVersion, setPaletteVersion] = useState(0);

    useEffect(() => {
        const observer = new MutationObserver(() =>
            setPaletteVersion((v) => v + 1)
        );

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-palette'],
        });

        return () => observer.disconnect();
    }, []);

    const cloud = useMemo(
        () =>
            hydrated && quality !== 'flat' && paletteVersion >= 0
                ? cloudTextureUrl(readFogPalette(document.documentElement))
                : '',
        [hydrated, quality, paletteVersion]
    );

    if (!map.maze || !cells) return null;

    const width = map.cols * UNIT;

    const height = map.rows * UNIT;

    const driftX = width * (CLOUD_OVERSCAN - 1) * 0.5;

    const driftY = height * (CLOUD_OVERSCAN - 1) * 0.5;

    return (
        <g pointerEvents="none" data-maze-fow-layer="">
            <defs>
                <mask
                    id={id}
                    maskUnits="userSpaceOnUse"
                    x={0}
                    y={0}
                    width={width}
                    height={height}
                >
                    <rect
                        x={0}
                        y={0}
                        width={width}
                        height={height}
                        fill="white"
                    />
                    {[...cells].map((key) => {
                        const { x, y } = parseCellKey(key);

                        return (
                            <rect
                                key={key}
                                data-maze-visible={key}
                                x={x * UNIT}
                                y={y * UNIT}
                                width={UNIT}
                                height={UNIT}
                                fill="black"
                            />
                        );
                    })}
                </mask>
            </defs>
            <rect
                data-maze-fow={id}
                x={0}
                y={0}
                width={width}
                height={height}
                fill="#000"
                mask={`url(#${id})`}
            />
            {cloud && (
                <g mask={`url(#${id})`} data-maze-fow-cloud={quality}>
                    <image
                        href={cloud}
                        x={-driftX}
                        y={-driftY}
                        width={width * CLOUD_OVERSCAN}
                        height={height * CLOUD_OVERSCAN}
                        preserveAspectRatio="none"
                        opacity={0.55}
                    >
                        {quality === 'live' && (
                            <animateTransform
                                attributeName="transform"
                                type="translate"
                                values={`0 0;${driftX} ${driftY * 0.6};0 0`}
                                dur={`${DRIFT_SECONDS}s`}
                                repeatCount="indefinite"
                            />
                        )}
                    </image>
                </g>
            )}
        </g>
    );
});
