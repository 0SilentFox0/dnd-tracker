'use client';

import { memo, useMemo } from 'react';
import { Flame } from 'lucide-react';

import {
    DIFFICULT_HATCH_ID,
    FLAME_ID,
    FLAME_SIZE,
    HATCH_ID,
    HAZARD_GRADIENT_ID,
    inWindow,
    TERRAIN_FILL,
    ZONE_FILL,
} from './grid-style';

import {
    cellCenter,
    type GridWindow,
    isDamagingCell,
    parseCellKey,
    regionFillPath,
    regionOutlinePath,
    UNIT,
} from '@/lib/utils/battle/grid';
import type { BattleMapConfig } from '@/types/battle-grid';

interface TerrainGroups {
    wall: string[];
    barrier: string[];
    difficultKind: string[];
    difficult: string[];
    obscured: string[];
    zone: string[];
    damaging: string[];
    timed: string[];
}

function groupTerrain(
    terrain: BattleMapConfig['terrain'],
    blocked: ReadonlySet<string>
): TerrainGroups {
    const g: TerrainGroups = {
        wall: [],
        barrier: [],
        difficultKind: [],
        difficult: [],
        obscured: [],
        zone: [],
        damaging: [],
        timed: [],
    };

    if (!terrain) return g;

    for (const [key, cell] of Object.entries(terrain)) {
        if (blocked.has(key)) continue;

        if (cell.kind === 'wall') g.wall.push(key);
        else if (cell.kind === 'barrier') g.barrier.push(key);
        else if (cell.kind === 'difficult') g.difficultKind.push(key);
        else if (isDamagingCell(cell))
            (cell.untilRound !== undefined ? g.timed : g.damaging).push(key);
        else g.zone.push(key);

        if (cell.kind === 'difficult' || cell.difficult) g.difficult.push(key);

        if (cell.obscured) g.obscured.push(key);
    }

    return g;
}

export const GridDefs = memo(function GridDefs() {
    return (
        <defs>
            <pattern
                id={HATCH_ID}
                patternUnits="userSpaceOnUse"
                width={UNIT * 0.14}
                height={UNIT * 0.14}
                patternTransform="rotate(45)"
            >
                <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2={UNIT * 0.14}
                    stroke="rgba(255,255,255,.28)"
                    strokeWidth={UNIT * 0.03}
                />
            </pattern>
            <pattern
                id={DIFFICULT_HATCH_ID}
                patternUnits="userSpaceOnUse"
                width={UNIT * 0.2}
                height={UNIT * 0.2}
                patternTransform="rotate(-45)"
            >
                <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2={UNIT * 0.2}
                    stroke="rgba(190,140,70,.7)"
                    strokeWidth={UNIT * 0.035}
                />
            </pattern>
            <radialGradient id={HAZARD_GRADIENT_ID}>
                <stop offset="0%" stopColor="#ffd36b" stopOpacity={0.75} />
                <stop offset="55%" stopColor="#ff7a1a" stopOpacity={0.62} />
                <stop offset="100%" stopColor="#b8200f" stopOpacity={0.7} />
            </radialGradient>
            <symbol id={FLAME_ID} viewBox="0 0 24 24" overflow="visible">
                <Flame
                    width={24}
                    height={24}
                    color="#ffe08a"
                    fill="rgba(255,120,30,.85)"
                    strokeWidth={1.6}
                />
            </symbol>
        </defs>
    );
});

interface GridStaticProps {
    map: BattleMapConfig;
    blocked: ReadonlySet<string>;
    window: GridWindow | null;
    rotated: boolean;
    showBlocked?: boolean;
}

/** Місцевість, жар і заблоковані клітинки: кілька злитих шляхів, кількість елементів не залежить від площі карти. */
export const GridStatic = memo(function GridStatic({
    map,
    blocked,
    window,
    rotated,
    showBlocked,
}: GridStaticProps) {
    const g = useMemo(
        () => groupTerrain(map.terrain, blocked),
        [map.terrain, blocked]
    );

    const paths = useMemo(() => {
        const hazard = [...g.damaging, ...g.timed];

        return {
            wall: regionFillPath(g.wall),
            barrier: regionFillPath(g.barrier),
            difficultKind: regionFillPath(g.difficultKind),
            difficult: regionFillPath(g.difficult),
            obscured: regionFillPath(g.obscured),
            zone: regionFillPath(g.zone),
            damaging: regionFillPath(g.damaging),
            timed: regionFillPath(g.timed),
            hazardFill: regionFillPath(hazard),
            hazardOutline: regionOutlinePath(hazard),
            blocked: showBlocked ? regionFillPath(blocked) : '',
        };
    }, [g, blocked, showBlocked]);

    const hazardKeys = useMemo(() => [...g.damaging, ...g.timed], [g]);

    const flames = useMemo(
        () =>
            hazardKeys.filter(
                (k) => !window || inWindow(window, parseCellKey(k))
            ),
        [hazardKeys, window]
    );

    return (
        <g pointerEvents="none">
            {g.wall.length > 0 && (
                <g data-terrain="wall">
                    <path d={paths.wall} fill={TERRAIN_FILL.wall} />
                </g>
            )}
            {g.barrier.length > 0 && (
                <g data-terrain="barrier">
                    <path d={paths.barrier} fill={TERRAIN_FILL.barrier} />
                    <path d={paths.barrier} fill={`url(#${HATCH_ID})`} />
                </g>
            )}
            {g.difficultKind.length > 0 && (
                <g data-terrain="difficult">
                    <path d={paths.difficultKind} fill="transparent" />
                </g>
            )}
            {(g.damaging.length > 0 ||
                g.timed.length > 0 ||
                g.zone.length > 0) && (
                <g data-terrain="hazard">
                    {g.zone.length > 0 && (
                        <path d={paths.zone} fill={ZONE_FILL} />
                    )}
                    {g.damaging.length > 0 && (
                        <path d={paths.damaging} fill={TERRAIN_FILL.hazard} />
                    )}
                    {g.timed.length > 0 && (
                        <path
                            data-hazard-timed=""
                            d={paths.timed}
                            fill={TERRAIN_FILL.hazard}
                        />
                    )}
                    {hazardKeys.length > 0 && (
                        <path
                            d={paths.hazardOutline}
                            fill="none"
                            stroke="#ff9a2a"
                            strokeOpacity={0.9}
                            strokeWidth={1.5}
                            vectorEffect="non-scaling-stroke"
                        />
                    )}
                </g>
            )}
            {g.difficult.length > 0 && (
                <path
                    data-difficult=""
                    d={paths.difficult}
                    fill={`url(#${DIFFICULT_HATCH_ID})`}
                />
            )}
            {g.obscured.length > 0 && (
                <path
                    data-obscured=""
                    d={paths.obscured}
                    fill="rgba(210,215,225,.38)"
                />
            )}
            {hazardKeys.length > 0 && (
                <g data-hazard-layer="">
                    <g className="battle-map-ember">
                        <path d={paths.hazardFill} fill="rgba(255,190,70,.3)" />
                        <path
                            d={paths.hazardOutline}
                            fill="none"
                            stroke="#ffc35a"
                            strokeWidth={2}
                            vectorEffect="non-scaling-stroke"
                        />
                    </g>
                    <g className="battle-map-flame">
                        {flames.map((k) => {
                            const c = cellCenter(parseCellKey(k));

                            return (
                                <use
                                    key={k}
                                    data-hazard-flame={k}
                                    href={`#${FLAME_ID}`}
                                    x={c.x - FLAME_SIZE / 2}
                                    y={c.y - FLAME_SIZE / 2}
                                    width={FLAME_SIZE}
                                    height={FLAME_SIZE}
                                    transform={
                                        rotated
                                            ? `rotate(-90 ${c.x} ${c.y})`
                                            : undefined
                                    }
                                />
                            );
                        })}
                    </g>
                </g>
            )}
            {paths.blocked && (
                <path
                    data-blocked=""
                    d={paths.blocked}
                    fill="rgba(20,0,0,.6)"
                />
            )}
        </g>
    );
});
