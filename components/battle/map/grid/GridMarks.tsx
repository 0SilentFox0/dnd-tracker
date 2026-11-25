'use client';

import { memo, useMemo } from 'react';

import { markFill, type MarkValue } from './grid-style';

import {
    cellPolygon,
    gridLinesPath,
    type GridWindow,
    isMoveMark,
    parseCellKey,
    regionFillPath,
    regionOutlinePath,
    UNIT,
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

    const sparse: Array<[string, MarkValue]> = [];

    if (marks)
        for (const [key, mark] of marks) {
            if (blocked.has(key)) continue;

            if (isMoveMark(mark)) move.push(key);
            else if (SPARSE.has(mark)) sparse.push([key, mark]);
        }

    return { move, sparse };
}

const rangeOutline = (w: GridWindow) =>
    `M${w.x * UNIT} ${w.y * UNIT}h${w.cols * UNIT}v${w.rows * UNIT}h${-w.cols * UNIT}z`;

export const GridMarks = memo(function GridMarks({
    map,
    blocked,
    marks,
    range,
    maskId,
}: GridMarksProps) {
    const { cols, rows, terrain } = map;

    const split = useMemo(() => splitMarks(marks, blocked), [marks, blocked]);

    const moveOutline = useMemo(
        () => (split.move.length ? regionOutlinePath(split.move) : ''),
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

    const gridless = staticMask;

    const rangeD = useMemo(() => (range ? rangeOutline(range) : ''), [range]);

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
                {split.sparse.map(([key, mark]) => (
                    <polygon
                        key={key}
                        data-mark-cell={key}
                        data-mark={mark}
                        points={cellPolygon(parseCellKey(key))}
                        fill={markFill(mark)}
                    />
                ))}
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
                {moveOutline && (
                    <path
                        data-fx-zone="move"
                        className="battle-map-reach-outline battle-map-zone"
                        d={moveOutline}
                        fill="none"
                        strokeWidth={1.5}
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                    />
                )}
                {rangeD && (
                    <path
                        data-range-outline=""
                        className="battle-map-range-outline battle-map-zone"
                        d={rangeD}
                        fill="none"
                        strokeWidth={1.5}
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                    />
                )}
            </g>
        </>
    );
});
