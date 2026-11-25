import type { useTranslations } from 'next-intl';

import {
    cellKey,
    type CellMark,
    type GridWindow,
    unitOf,
} from '@/lib/utils/battle/grid';
import type { GridPoint, TerrainCell } from '@/types/battle-grid';

export const HATCH_ID = 'battle-map-barrier-hatch';

export const DIFFICULT_HATCH_ID = 'battle-map-difficult-hatch';

export const HAZARD_GRADIENT_ID = 'battle-map-hazard-fire';

export const FLAME_ID = 'battle-map-flame';

export const FLAME_SIZE = unitOf(0.42);

export type MarkValue = CellMark | number | undefined;

export function markFill(mark: MarkValue): string {
    if (mark === 'pick') return 'rgba(110,170,255,.3)';

    if (mark === 'picked') return 'rgba(240,200,70,.5)';

    return mark === 'invalid-target' ? 'rgba(120,120,120,.25)' : 'transparent';
}

export const ZONE_FILL = 'rgba(160,130,210,.16)';

export const TERRAIN_FILL = {
    wall: 'rgba(0,0,0,.6)',
    barrier: 'rgba(0,0,0,.75)',
    difficult: 'transparent',
    hazard: `url(#${HAZARD_GRADIENT_ID})`,
} as const;

const cellSets = new WeakMap<string[], Set<string>>();

export function inWindow(w: GridWindow, p: GridPoint): boolean {
    if (w.cells) {
        let set = cellSets.get(w.cells);

        if (!set) cellSets.set(w.cells, (set = new Set(w.cells)));

        return set.has(cellKey(p));
    }

    return p.x >= w.x && p.x < w.x + w.cols && p.y >= w.y && p.y < w.y + w.rows;
}

type MapT = ReturnType<typeof useTranslations<'battle.map'>>;

function hazardTitle(
    t: MapT,
    cell: TerrainCell,
    round: number | undefined,
    formatDuration: (rounds: number) => string
): string {
    const label = cell.label ?? t('hazardDefault');

    if (cell.untilRound === undefined) return label;

    return round === undefined
        ? t('hazardUntilEnd', { label, round: cell.untilRound })
        : t('hazardRoundsLeft', {
              label,
              rounds: formatDuration(Math.max(1, cell.untilRound - round + 1)),
          });
}

export function terrainTitle(
    t: MapT,
    cell: TerrainCell,
    round: number | undefined,
    formatDuration: (rounds: number) => string
): string | null {
    if (cell.kind === 'barrier')
        return cell.untilRound !== undefined
            ? t('barrierUntil', { round: cell.untilRound })
            : t('barrier');

    if (cell.kind === 'difficult') return cell.label ?? t('difficultDefault');

    return cell.kind === 'hazard'
        ? hazardTitle(t, cell, round, formatDuration)
        : null;
}

export const GRID_COLORS = {
    barrierHatch: 'rgba(255,255,255,.28)',
    difficultHatch: 'rgba(190,140,70,.7)',
    hazardGradient: ['#ffd36b', '#ff7a1a', '#b8200f'],
    flameStroke: '#ffe08a',
    flameFill: 'rgba(255,120,30,.85)',
    hazardOutline: '#ff9a2a',
    obscured: 'rgba(210,215,225,.38)',
    hazardEmber: 'rgba(255,190,70,.3)',
    hazardEmberOutline: '#ffc35a',
    blocked: 'rgba(20,0,0,.6)',
} as const;
