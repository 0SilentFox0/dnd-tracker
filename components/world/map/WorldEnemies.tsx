'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Skull } from 'lucide-react';

import { sealStyle } from './WorldPins';

import { HudButton } from '@/components/hud';
import { MARKER_ICON } from '@/components/world/marker-icons';
import { DEFAULT_ENEMY_COLOR } from '@/lib/constants/world';
import { usePinGesture } from '@/lib/hooks/world';
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

    const [dragging, setDragging] = useState<{
        id: string;
        point: MapPoint;
    } | null>(null);

    const { bind } = usePinGesture<string>({
        draggable: !!handlers.onEnemyDrag,
        onClick: (id) => {
            setDragging(null);
            handlers.onEnemyClick?.(id);
        },
        onDragMove: (id, e) => {
            const point = toPoint(e.clientX, e.clientY);

            setDragging(point ? { id, point } : null);
        },
        onDragEnd: (id, e) => {
            setDragging(null);

            const to = toPoint(e.clientX, e.clientY);

            if (to) handlers.onEnemyDrag?.(id, to);
        },
        onCancel: () => setDragging(null),
    });

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
                        {...bind(enemy.id)}
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
