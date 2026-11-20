'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Skull } from 'lucide-react';

import { sealStyle } from './WorldPins';

import { HudButton } from '@/components/hud';
import { MARKER_ICON } from '@/components/world/marker-icons';
import { DEFAULT_ENEMY_COLOR } from '@/lib/constants/world';
import { exceedsDragThreshold } from '@/lib/utils/world/hero-drag';
import type { MapPoint, WorldEnemyPin } from '@/types/world';

export interface WorldEnemiesProps {
    enemies: WorldEnemyPin[];
    zoom: number;
    selectedId?: string | null;
    toPoint(clientX: number, clientY: number): MapPoint | null;
    handlers: {
        onEnemyClick?(id: string): void;
        onEnemyDrag?(id: string, p: MapPoint): void;
    };
}

export function WorldEnemies({
    enemies,
    zoom,
    selectedId,
    toPoint,
    handlers,
}: WorldEnemiesProps) {
    const t = useTranslations('world.enemy');

    const gesture = useRef<{
        id: string;
        start: { x: number; y: number };
        active: boolean;
    } | null>(null);

    const [dragging, setDragging] = useState<{
        id: string;
        point: MapPoint;
    } | null>(null);

    const draggable = !!handlers.onEnemyDrag;

    return (
        <>
            {enemies.map((enemy) => {
                const spot = dragging?.id === enemy.id ? dragging.point : enemy;

                const Icon = (enemy.icon && MARKER_ICON[enemy.icon]) || Skull;

                return (
                    <HudButton
                        key={enemy.id}
                        type="button"
                        aria-label={enemy.name}
                        data-enemy
                        data-selected={enemy.id === selectedId}
                        data-dragging={dragging?.id === enemy.id}
                        className="atlas-pin atlas-enemy absolute"
                        style={{
                            left: `${spot.x * 100}%`,
                            top: `${spot.y * 100}%`,
                            transform: `translate(-50%, -50%) scale(${1 / zoom})`,
                            touchAction: 'none',
                        }}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            gesture.current = {
                                id: enemy.id,
                                start: { x: e.clientX, y: e.clientY },
                                active: false,
                            };

                            try {
                                e.currentTarget.setPointerCapture?.(
                                    e.pointerId
                                );
                            } catch {
                                // synthetic pointer events have no active pointer
                            }
                        }}
                        onPointerMove={(e) => {
                            const g = gesture.current;

                            if (!g || !draggable) return;

                            e.stopPropagation();

                            if (
                                !g.active &&
                                !exceedsDragThreshold(g.start, {
                                    x: e.clientX,
                                    y: e.clientY,
                                })
                            )
                                return;

                            g.active = true;

                            const point = toPoint(e.clientX, e.clientY);

                            setDragging(point ? { id: g.id, point } : null);
                        }}
                        onPointerUp={(e) => {
                            const g = gesture.current;

                            gesture.current = null;
                            setDragging(null);

                            if (!g) return;

                            e.stopPropagation();

                            if (!g.active) {
                                handlers.onEnemyClick?.(g.id);

                                return;
                            }

                            const to = toPoint(e.clientX, e.clientY);

                            if (to) handlers.onEnemyDrag?.(g.id, to);
                        }}
                        onPointerCancel={() => {
                            gesture.current = null;
                            setDragging(null);
                        }}
                        onDoubleClick={(e) => e.stopPropagation()}
                    >
                        <span
                            className="atlas-seal"
                            style={sealStyle(
                                enemy.color ?? DEFAULT_ENEMY_COLOR
                            )}
                        >
                            <Icon className="size-4" aria-hidden />
                        </span>
                        <span className="atlas-enemy-badge">{t('dmOnly')}</span>
                        <span className="atlas-label">{enemy.name}</span>
                    </HudButton>
                );
            })}
        </>
    );
}
