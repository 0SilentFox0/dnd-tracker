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
import { cn } from '@/lib/utils';
import {
    backgroundBox,
    cellCenter,
    gridOf,
    type GridWindow,
    mapSize,
    regionFillPath,
    UNIT,
} from '@/lib/utils/battle/grid';
import { toMediaUrl } from '@/lib/utils/common/image-url';
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
    rotated?: boolean;
}

export function MapMinimap({
    map,
    win: cellWin,
    participants,
    viewport,
    onPick,
    hiddenCells,
    phone,
    rotated = false,
}: Props) {
    const t = useTranslations('battle.map.camera');

    const grid = gridOf(map);

    const hex = grid === 'hex';

    const hexSpan = hex ? mapSize(map, grid) : null;

    const win: GridWindow = hexSpan
        ? {
              x: 0,
              y: 0,
              cols: hexSpan.width / UNIT,
              rows: hexSpan.height / UNIT,
          }
        : cellWin;

    const store = phone ? phoneOpen : desktopOpen;

    const expanded = useStorageValue(store, phone ? false : true);

    const maxSide = phone ? 120 : 160;

    const vbW = rotated ? win.rows : win.cols;

    const vbH = rotated ? win.cols : win.rows;

    const width = Math.round(maxSide * Math.min(1, vbW / vbH));

    const height = Math.round(maxSide * Math.min(1, vbH / vbW));

    const src = toMediaUrl(map.background ?? DEFAULT_MAP_BACKGROUND);

    const { aspect, imgProps } = useLoadedAspect(src);

    const background = backgroundBox(map, 1, aspect, grid);

    const blocked = map.blocked?.length ? regionFillPath(map.blocked, grid) : '';

    const fog = hiddenCells ? regionFillPath(hiddenCells, grid) : '';

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
        <div
            className={cn(
                'absolute z-30',
                phone ? 'top-11 right-2' : 'top-2 right-2'
            )}
        >
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
                        viewBox={`0 0 ${vbW} ${vbH}`}
                        width={width}
                        height={height}
                        preserveAspectRatio="none"
                        onPointerDown={pick}
                        className="block cursor-crosshair touch-none"
                    >
                        <g
                            transform={
                                rotated
                                    ? `translate(${win.rows} 0) rotate(90)`
                                    : undefined
                            }
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

                                const size = hex
                                    ? 1
                                    : Math.min(
                                          3,
                                          Math.max(
                                              1,
                                              participant.combatStats
                                                  .gridSize ?? 1
                                          )
                                      );

                                const hexCentre = hex
                                    ? cellCenter(point, grid)
                                    : null;

                                const centre = hexCentre
                                    ? {
                                          x: hexCentre.x / UNIT,
                                          y: hexCentre.y / UNIT,
                                      }
                                    : {
                                          x: point.x + size / 2,
                                          y: point.y + size / 2,
                                      };

                                return (
                                    <circle
                                        key={participant.basicInfo.id}
                                        data-minimap-participant={
                                            participant.basicInfo.id
                                        }
                                        cx={centre.x - win.x}
                                        cy={centre.y - win.y}
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
                        </g>
                        <rect
                            x={viewport.x * vbW}
                            y={viewport.y * vbH}
                            width={viewport.w * vbW}
                            height={viewport.h * vbH}
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
