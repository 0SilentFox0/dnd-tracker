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

import { DRAG_THRESHOLD } from '@/lib/hooks/common';
import { useFormatDuration } from '@/lib/i18n/use-duration';
import {
    cellAtScreenPoint,
    cellKey,
    cellPolygon,
    gridOf,
    mapSize,
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
    tokenDrag?: ReadonlySet<string>;
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

    const { onCellClick, onCellHover, wasDragged, svgRef, tokenDrag } =
        cellActions;

    const { cols, rows, terrain } = map;

    const grid = gridOf(map);

    const span = mapSize(map, grid);

    const [hover, setHover] = useState<GridPoint | null>(null);

    const lastKey = useRef<string | null>(null);

    const cellAt = (e: PointerEvent | React.MouseEvent): GridPoint | null => {
        const ctm = svgRef.current?.getScreenCTM?.();

        return ctm
            ? cellAtScreenPoint({ cols, rows }, ctm, e.clientX, e.clientY, grid)
            : null;
    };

    const press = useRef<{
        x: number;
        y: number;
        id: number;
        active: boolean;
    } | null>(null);

    const swallowClick = useRef(false);

    const endDrag = (e: PointerEvent, drop: boolean) => {
        const d = press.current;

        if (!d || d.id !== e.pointerId) return;

        press.current = null;
        (e.currentTarget as HTMLElement).style.cursor = '';
        e.currentTarget.releasePointerCapture?.(e.pointerId);

        if (!d.active) return;

        swallowClick.current = true;

        const p = drop ? cellAt(e) : null;

        if (p && !tokenDrag?.has(cellKey(p))) onCellClick?.(p);
        else moveTo(null);
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
            onPointerMove={(e) => {
                const d = press.current;

                if (d && d.id === e.pointerId) {
                    if (
                        !d.active &&
                        Math.hypot(e.clientX - d.x, e.clientY - d.y) >
                            DRAG_THRESHOLD
                    )
                        d.active = true;

                    if (d.active) {
                        e.stopPropagation();
                        e.currentTarget.style.cursor = 'grabbing';

                        const p = cellAt(e);

                        moveTo(p && !isBlocked(p) ? p : null);

                        return;
                    }
                }

                moveTo(cellAt(e));
            }}
            onPointerLeave={() => {
                if (!press.current?.active) moveTo(null);
            }}
            onPointerUp={(e) => endDrag(e, true)}
            onPointerCancel={(e) => endDrag(e, false)}
            onPointerDown={(e) => {
                if (press.current && press.current.id !== e.pointerId) {
                    press.current = null;
                    swallowClick.current = true;
                    e.currentTarget.style.cursor = '';
                    moveTo(null);

                    return;
                }

                swallowClick.current = false;

                const at = !onStrokeStart && tokenDrag ? cellAt(e) : null;

                if (
                    at &&
                    tokenDrag?.has(cellKey(at)) &&
                    e.button === 0 &&
                    e.isPrimary
                ) {
                    press.current = {
                        x: e.clientX,
                        y: e.clientY,
                        id: e.pointerId,
                        active: false,
                    };
                    e.currentTarget.setPointerCapture?.(e.pointerId);
                }

                if (e.pointerType !== 'mouse') moveTo(cellAt(e));

                const p = onStrokeStart && cellAt(e);

                if (p) onStrokeStart?.(p, e);
            }}
            onClick={(e) => {
                if (swallowClick.current) {
                    swallowClick.current = false;

                    return;
                }

                if (onStrokeStart || wasDragged()) return;

                const p = cellAt(e);

                if (!p) return;

                if (isBlocked(p) && !scene.clickableBlocked) return;

                onCellClick?.(p);
            }}
        >
            <rect
                data-grid-hit=""
                width={span.width}
                height={span.height}
                fill="transparent"
            />
            {hover && !hoverBlocked && (
                <polygon
                    data-grid-hover={hoverKey}
                    points={cellPolygon(hover, grid)}
                    fill="transparent"
                    pointerEvents="all"
                >
                    {title && <title>{title}</title>}
                </polygon>
            )}
        </g>
    );
});
