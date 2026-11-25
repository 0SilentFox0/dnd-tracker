'use client';

import { memo, useMemo } from 'react';

import { markFill, type MarkValue } from './grid-style';

import {
    cellPolygon,
    gridLinesPath,
    gridOf,
    type GridWindow,
    isMoveMark,
    mapSize,
    parseCellKey,
    regionFillPath,
    regionOutlinePath,
    unitOf,
} from '@/lib/utils/battle/grid';
import type {
    BattleMapConfig,
    BattleMapView,
    GridKind,
} from '@/types/battle-grid';

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

const rangeOutline = (w: GridWindow, grid: GridKind) =>
    w.cells
        ? regionOutlinePath(w.cells, grid)
        : `M${unitOf(w.x)} ${unitOf(w.y)}h${unitOf(w.cols)}v${unitOf(w.rows)}h${-unitOf(w.cols)}z`;

export const GridMarks = memo(function GridMarks({
    map,
    blocked,
    marks,
    range,
    maskId,
}: GridMarksProps) {
    const { cols, rows, terrain } = map;

    const grid = gridOf(map);

    const span = mapSize(map, grid);

    const split = useMemo(() => splitMarks(marks, blocked), [marks, blocked]);

    const moveOutline = useMemo(
        () => (split.move.length ? regionOutlinePath(split.move, grid) : ''),
        [split, grid]
    );

    const lines = useMemo(
        () => gridLinesPath(cols, rows, grid),
        [cols, rows, grid]
    );

    const staticMask = useMemo(() => {
        const keys = [...blocked];

        if (terrain)
            for (const [key, cell] of Object.entries(terrain))
                if (cell.kind === 'wall' || cell.kind === 'barrier')
                    keys.push(key);

        return keys.length ? regionFillPath(keys, grid) : '';
    }, [blocked, terrain, grid]);

    const gridless = staticMask;

    const rangeD = useMemo(
        () => (range ? rangeOutline(range, grid) : ''),
        [range, grid]
    );

    return (
        <>
            {gridless && (
                <mask
                    id={maskId}
                    maskUnits="userSpaceOnUse"
                    x={0}
                    y={0}
                    width={span.width}
                    height={span.height}
                >
                    <rect width={span.width} height={span.height} fill="#fff" />
                    <path d={gridless} fill="#000" />
                </mask>
            )}
            <g pointerEvents="none">
                {split.sparse.map(([key, mark]) => (
                    <polygon
                        key={key}
                        data-mark-cell={key}
                        data-mark={mark}
                        points={cellPolygon(parseCellKey(key), grid)}
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
