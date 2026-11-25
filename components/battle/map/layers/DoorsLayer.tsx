'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';

import { parseEdgeKey, UNIT } from '@/lib/utils/battle/grid';
import type { BattleMapConfig, DoorState } from '@/types/battle-grid';

const LEAF = UNIT;

const THICK = UNIT * 0.24;

const LOCK = UNIT * 0.3;

const MIN_HIT_PX = 30;

function edgeCentre(edge: string) {
    const { a, side } = parseEdgeKey(edge);

    return side === 'e'
        ? { x: (a.x + 1) * UNIT, y: (a.y + 0.5) * UNIT, side }
        : { x: (a.x + 0.5) * UNIT, y: (a.y + 1) * UNIT, side };
}

export function doorCentre(edge: string): { x: number; y: number } {
    const { x, y } = edgeCentre(edge);

    return { x, y };
}

interface DoorsLayerProps {
    doors: NonNullable<BattleMapConfig['doors']>;
    pxPerUnit: number;
    rotated: boolean;
    showLock: boolean;
    onPress?: (edge: string, door: DoorState) => void;
}

/** Door glyphs on cell edges; the hit circle is at least 30px wide so it works under a finger. */
export const DoorsLayer = memo(function DoorsLayer({
    doors,
    pxPerUnit,
    rotated,
    showLock,
    onPress,
}: DoorsLayerProps) {
    const t = useTranslations('battle.map.doors');

    const hit = Math.max(UNIT * 0.22, MIN_HIT_PX / 2 / pxPerUnit);

    return (
        <g data-map-doors="" pointerEvents={onPress ? undefined : 'none'}>
            {Object.entries(doors).map(([edge, door]) => {
                const { x, y, side } = edgeCentre(edge);

                const locked = showLock && !door.open && door.locked;

                const label = locked
                    ? t('stateLocked')
                    : door.open
                      ? t('stateOpen')
                      : t('stateClosed');

                return (
                    <g
                        key={edge}
                        data-map-door={edge}
                        data-door-open={door.open ? '' : undefined}
                    >
                        <g
                            transform={`translate(${x} ${y}) rotate(${side === 'e' ? 90 : 0})`}
                            pointerEvents="none"
                        >
                            <rect
                                x={-LEAF / 2}
                                y={-THICK / 2}
                                width={LEAF}
                                height={THICK}
                                rx={THICK / 4}
                                fill={
                                    door.open
                                        ? 'rgba(138,90,43,.55)'
                                        : '#8a5a2b'
                                }
                                stroke="#2b1a0a"
                                strokeWidth={2}
                                vectorEffect="non-scaling-stroke"
                                transform={
                                    door.open
                                        ? `rotate(-72 ${-LEAF / 2} 0)`
                                        : undefined
                                }
                            />
                        </g>
                        {locked && (
                            <g
                                data-door-lock=""
                                pointerEvents="none"
                                transform={
                                    rotated
                                        ? `rotate(-90 ${x} ${y})`
                                        : undefined
                                }
                            >
                                <Lock
                                    x={x - LOCK / 2}
                                    y={y - LOCK / 2}
                                    width={LOCK}
                                    height={LOCK}
                                    color="var(--hud-ink)"
                                    fill="rgba(0,0,0,.6)"
                                    strokeWidth={2}
                                />
                            </g>
                        )}
                        {onPress && (
                            <circle
                                data-door-hit={edge}
                                role="button"
                                aria-label={label}
                                cx={x}
                                cy={y}
                                r={hit}
                                fill="transparent"
                                pointerEvents="all"
                                style={{ cursor: 'pointer' }}
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onPress(edge, door);
                                }}
                            >
                                <title>{label}</title>
                            </circle>
                        )}
                    </g>
                );
            })}
        </g>
    );
});
