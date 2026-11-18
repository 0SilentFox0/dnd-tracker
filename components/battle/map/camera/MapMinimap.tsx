'use client';

import type { PointerEvent } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Map as MapIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DEFAULT_MAP_BACKGROUND } from '@/lib/constants/battle';
import { ParticipantSide } from '@/lib/constants/battle';
import { useLoadedAspect } from '@/lib/hooks/battle';
import { createStorageFlag, useStorageValue } from '@/lib/hooks/common';
import {
    backgroundBox,
    type GridWindow,
    regionFillPath,
    UNIT,
} from '@/lib/utils/battle/grid';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

const phoneOpen = createStorageFlag('battle-map-minimap-phone', false);

const desktopOpen = createStorageFlag('battle-map-minimap-desktop', true);

interface Props {
    map: BattleMapConfig;
    win: GridWindow;
    participants: BattleParticipant[];
    viewport: { x: number; y: number; w: number; h: number };
    onPick(nx: number, ny: number): void;
    hiddenCells?: Iterable<string> | null;
    phone: boolean;
}

export function MapMinimap({
    map,
    win,
    participants,
    viewport,
    onPick,
    hiddenCells,
    phone,
}: Props) {
    const t = useTranslations('battle.map.camera');

    const store = phone ? phoneOpen : desktopOpen;

    const expanded = useStorageValue(store, phone ? false : true);

    const maxSide = phone ? 120 : 160;

    const width = Math.round(maxSide * Math.min(1, win.cols / win.rows));

    const height = Math.round(maxSide * Math.min(1, win.rows / win.cols));

    const src = map.background ?? DEFAULT_MAP_BACKGROUND;

    const { aspect, imgProps } = useLoadedAspect(src);

    const background = backgroundBox(map, 1, aspect);

    const blocked = map.blocked?.length ? regionFillPath(map.blocked) : '';

    const fog = hiddenCells ? regionFillPath(hiddenCells) : '';

    const pick = (e: PointerEvent<SVGSVGElement>) => {
        e.stopPropagation();
        e.preventDefault();

        const rect = e.currentTarget.getBoundingClientRect();

        if (!rect.width || !rect.height) return;

        onPick(
            Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
            Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
        );
    };

    return (
        <div className="absolute top-2 right-2 z-30">
            {!expanded ? (
                <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t('minimapShow')}
                    onClick={() => store.set(true)}
                    className="border border-white/20 bg-black/75 shadow-lg"
                >
                    <MapIcon />
                </Button>
            ) : (
                <div className="relative overflow-hidden rounded-md border border-white/30 bg-black/80 p-1 shadow-lg">
                    <Image
                        src={src}
                        alt=""
                        width={1}
                        height={1}
                        className="hidden"
                        {...imgProps}
                    />
                    <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t('minimapHide')}
                        onClick={() => store.set(false)}
                        className="absolute top-1 right-1 z-10 bg-black/70"
                    >
                        <MapIcon />
                    </Button>
                    <svg
                        data-map-minimap
                        role="img"
                        aria-label={t('minimap')}
                        viewBox={`0 0 ${win.cols} ${win.rows}`}
                        width={width}
                        height={height}
                        preserveAspectRatio="none"
                        onPointerDown={pick}
                        className="block cursor-crosshair touch-none"
                    >
                        <image
                            href={src}
                            x={background.left - win.x}
                            y={background.top - win.y}
                            width={background.width}
                            height={background.height}
                            preserveAspectRatio="none"
                        />
                        <rect
                            x="0"
                            y="0"
                            width={win.cols}
                            height={win.rows}
                            fill="#292522"
                            opacity=".65"
                        />
                        {blocked && (
                            <path
                                d={blocked}
                                transform={`translate(${-win.x} ${-win.y}) scale(${1 / UNIT})`}
                                fill="#080706"
                            />
                        )}
                        {participants.map((participant) => {
                            const point = participant.battleData.position;

                            if (!point) return null;

                            const size = Math.min(
                                3,
                                Math.max(
                                    1,
                                    participant.combatStats.gridSize ?? 1
                                )
                            );

                            return (
                                <circle
                                    key={participant.basicInfo.id}
                                    data-minimap-participant={
                                        participant.basicInfo.id
                                    }
                                    cx={point.x + size / 2 - win.x}
                                    cy={point.y + size / 2 - win.y}
                                    r={Math.max(0.12, size * 0.16)}
                                    fill={
                                        participant.basicInfo.side ===
                                        ParticipantSide.ALLY
                                            ? 'var(--ally)'
                                            : 'var(--enemy)'
                                    }
                                />
                            );
                        })}
                        {fog && (
                            <path
                                d={fog}
                                data-minimap-fog
                                transform={`translate(${-win.x} ${-win.y}) scale(${1 / UNIT})`}
                                fill="#000"
                            />
                        )}
                        <rect
                            x={viewport.x * win.cols}
                            y={viewport.y * win.rows}
                            width={viewport.w * win.cols}
                            height={viewport.h * win.rows}
                            fill="rgba(255,255,255,.08)"
                            stroke="#fff"
                            strokeWidth=".08"
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>
                </div>
            )}
        </div>
    );
}
