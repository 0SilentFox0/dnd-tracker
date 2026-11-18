'use client';

import { memo, useMemo } from 'react';

import {
    markFill,
    type MarkValue,
    OUT_OF_RANGE_FILL,
    ZONE,
} from './grid-style';

import {
    cellPolygon,
    gridLinesPath,
    isMoveMark,
    parseCellKey,
    regionFillPath,
    regionOutlinePath,
    UNIT,
    windowPath,
} from '@/lib/utils/battle/grid';
import type { BattleMapConfig, BattleMapView } from '@/types/battle-grid';

interface GridMarksProps {
    map: BattleMapConfig;
    blocked: ReadonlySet<string>;
    marks: BattleMapView['marks'];
    range?: BattleMapView['range'];
    maskId: string;
}

const SPARSE = new Set<MarkValue>([
    'target',
    'pick',
    'picked',
    'invalid-target',
]);

function splitMarks(
    marks: BattleMapView['marks'],
    blocked: ReadonlySet<string>
) {
    const move: string[] = [];

    const danger: string[] = [];

    const sparse: Array<[string, MarkValue]> = [];

    if (marks)
        for (const [key, mark] of marks) {
            if (blocked.has(key)) continue;

            if (mark === 'move-danger') danger.push(key);
            else if (isMoveMark(mark)) move.push(key);
            else if (SPARSE.has(mark)) sparse.push([key, mark]);
        }

    return { move, danger, sparse };
}

function zonePaths(keys: string[]) {
    return keys.length
        ? { fill: regionFillPath(keys), outline: regionOutlinePath(keys) }
        : null;
}

export const GridMarks = memo(function GridMarks({
    map,
    blocked,
    marks,
    range,
    maskId,
}: GridMarksProps) {
    const { cols, rows, terrain } = map;

    const split = useMemo(() => splitMarks(marks, blocked), [marks, blocked]);

    const zones = useMemo(
        () => ({
            move: zonePaths(split.move),
            danger: zonePaths(split.danger),
        }),
        [split]
    );

    const lines = useMemo(() => gridLinesPath(cols, rows), [cols, rows]);

    const staticMask = useMemo(() => {
        const keys = [...blocked];

        if (terrain)
            for (const [key, cell] of Object.entries(terrain))
                if (cell.kind === 'wall' || cell.kind === 'barrier')
                    keys.push(key);

        return keys.length ? regionFillPath(keys) : '';
    }, [blocked, terrain]);

    const gridless = [staticMask, zones.move?.fill, zones.danger?.fill]
        .filter(Boolean)
        .join('');

    const outOfRange = useMemo(
        () => (range ? windowPath({ cols, rows }, range) : ''),
        [range, cols, rows]
    );

    return (
        <>
            {gridless && (
                <mask
                    id={maskId}
                    maskUnits="userSpaceOnUse"
                    x={0}
                    y={0}
                    width={cols * UNIT}
                    height={rows * UNIT}
                >
                    <rect
                        width={cols * UNIT}
                        height={rows * UNIT}
                        fill="#fff"
                    />
                    <path d={gridless} fill="#000" />
                </mask>
            )}
            <g pointerEvents="none">
                {zones.move && (
                    <path
                        data-zone-fill="move"
                        d={zones.move.fill}
                        fill={ZONE.move.fill}
                    />
                )}
                {zones.danger && (
                    <path
                        data-zone-fill="danger"
                        d={zones.danger.fill}
                        fill={ZONE.danger.fill}
                    />
                )}
                {split.sparse.map(([key, mark]) => (
                    <polygon
                        key={key}
                        data-mark-cell={key}
                        data-mark={mark}
                        points={cellPolygon(parseCellKey(key))}
                        fill={markFill(mark)}
                    />
                ))}
                {outOfRange && (
                    <path
                        data-out-of-range=""
                        d={outOfRange}
                        fillRule="evenodd"
                        fill={OUT_OF_RANGE_FILL}
                    />
                )}
                <path
                    data-grid-lines=""
                    d={lines}
                    fill="none"
                    stroke="rgba(255,255,255,1)"
                    strokeOpacity={map.opacity}
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                    mask={gridless ? `url(#${maskId})` : undefined}
                />
                {(['move', 'danger'] as const).map((kind) => {
                    const zone = zones[kind];

                    return (
                        zone && (
                            <g key={kind}>
                                <path
                                    d={zone.outline}
                                    fill="none"
                                    stroke={ZONE[kind].glow}
                                    strokeWidth={4}
                                    strokeLinejoin="round"
                                    vectorEffect="non-scaling-stroke"
                                />
                                <path
                                    data-fx-zone={kind}
                                    d={zone.outline}
                                    fill="none"
                                    stroke={ZONE[kind].stroke}
                                    strokeWidth={1.5}
                                    strokeLinejoin="round"
                                    vectorEffect="non-scaling-stroke"
                                />
                            </g>
                        )
                    );
                })}
            </g>
        </>
    );
});
