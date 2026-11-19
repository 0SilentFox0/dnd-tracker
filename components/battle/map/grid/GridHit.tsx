'use client';

import {
    memo,
    type PointerEvent,
    type RefObject,
    useRef,
    useState,
} from 'react';
import { useTranslations } from 'next-intl';

import { terrainTitle } from './grid-style';

import { useFormatDuration } from '@/lib/i18n/use-duration';
import {
    cellAtScreenPoint,
    cellKey,
    cellPolygon,
    UNIT,
} from '@/lib/utils/battle/grid';
import type {
    BattleMapActions,
    BattleMapConfig,
    GridPoint,
} from '@/types/battle-grid';

export interface GridCellActions {
    onCellClick?: BattleMapActions['onCellClick'];
    onCellHover?: BattleMapActions['onCellHover'];
    wasDragged: () => boolean;
    svgRef: RefObject<SVGSVGElement | null>;
}

interface GridHitProps {
    map: BattleMapConfig;
    blocked: ReadonlySet<string>;
    cellActions: GridCellActions;
    onStrokeStart?: (p: GridPoint, e: PointerEvent) => void;
    scene: { round?: number; clickableBlocked?: boolean };
}

export const GridHit = memo(function GridHit({
    map,
    blocked,
    cellActions,
    onStrokeStart,
    scene,
}: GridHitProps) {
    const t = useTranslations('battle.map');

    const formatDuration = useFormatDuration();

    const { onCellClick, onCellHover, wasDragged, svgRef } = cellActions;

    const { cols, rows, terrain } = map;

    const [hover, setHover] = useState<GridPoint | null>(null);

    const lastKey = useRef<string | null>(null);

    const cellAt = (e: PointerEvent | React.MouseEvent): GridPoint | null => {
        const ctm = svgRef.current?.getScreenCTM?.();

        return ctm
            ? cellAtScreenPoint({ cols, rows }, ctm, e.clientX, e.clientY)
            : null;
    };

    const isBlocked = (p: GridPoint) => blocked.has(cellKey(p));

    const moveTo = (p: GridPoint | null) => {
        const key = p ? cellKey(p) : null;

        if (key === lastKey.current) return;

        lastKey.current = key;
        setHover(p);

        if (!onStrokeStart) onCellHover?.(p && !isBlocked(p) ? p : null);
    };

    const hoverKey = hover ? cellKey(hover) : null;

    const hoverBlocked = hover ? isBlocked(hover) : false;

    const clickable = hoverBlocked ? scene.clickableBlocked : !!onCellClick;

    const cursor = onStrokeStart
        ? 'crosshair'
        : clickable && hover
          ? 'pointer'
          : undefined;

    const cell = hoverKey && !hoverBlocked ? terrain?.[hoverKey] : undefined;

    const title = cell && terrainTitle(t, cell, scene.round, formatDuration);

    return (
        <g
            style={{ cursor }}
            onPointerMove={(e) => moveTo(cellAt(e))}
            onPointerLeave={() => moveTo(null)}
            onPointerDown={(e) => {
                if (e.pointerType !== 'mouse') moveTo(cellAt(e));

                const p = onStrokeStart && cellAt(e);

                if (p) onStrokeStart?.(p, e);
            }}
            onClick={(e) => {
                if (onStrokeStart || wasDragged()) return;

                const p = cellAt(e);

                if (!p) return;

                if (isBlocked(p) && !scene.clickableBlocked) return;

                onCellClick?.(p);
            }}
        >
            <rect
                data-grid-hit=""
                width={cols * UNIT}
                height={rows * UNIT}
                fill="transparent"
            />
            {hover && !hoverBlocked && (
                <polygon
                    data-grid-hover={hoverKey}
                    points={cellPolygon(hover)}
                    fill="transparent"
                    pointerEvents="all"
                >
                    {title && <title>{title}</title>}
                </polygon>
            )}
        </g>
    );
});
