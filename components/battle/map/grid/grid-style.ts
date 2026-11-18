import type { useTranslations } from 'next-intl';

import { type CellMark, type GridWindow, UNIT } from '@/lib/utils/battle/grid';
import type { GridPoint, TerrainCell } from '@/types/battle-grid';

export const HATCH_ID = 'battle-map-barrier-hatch';

export const DIFFICULT_HATCH_ID = 'battle-map-difficult-hatch';

export const HAZARD_GRADIENT_ID = 'battle-map-hazard-fire';

export const FLAME_ID = 'battle-map-flame';

export const FLAME_SIZE = UNIT * 0.42;

export const ZONE = {
    move: {
        fill: 'rgba(90,210,80,.07)',
        stroke: 'rgba(140,255,110,.6)',
        glow: 'rgba(125,255,90,.12)',
    },
    danger: {
        fill: 'rgba(225,70,55,.09)',
        stroke: 'rgba(255,100,85,.65)',
        glow: 'rgba(255,90,74,.13)',
    },
} as const;

export type MarkValue = CellMark | number | undefined;

export function markFill(mark: MarkValue): string {
    if (mark === 'target') return 'rgba(230,80,60,.35)';

    if (mark === 'pick') return 'rgba(110,170,255,.3)';

    if (mark === 'picked') return 'rgba(240,200,70,.5)';

    return mark === 'invalid-target' ? 'rgba(120,120,120,.25)' : 'transparent';
}

export const OUT_OF_RANGE_FILL = 'rgba(0,0,0,.45)';

export const ZONE_FILL = 'rgba(160,130,210,.16)';

export const TERRAIN_FILL = {
    wall: 'rgba(0,0,0,.6)',
    barrier: 'rgba(0,0,0,.75)',
    difficult: 'transparent',
    hazard: `url(#${HAZARD_GRADIENT_ID})`,
} as const;

export const inWindow = (w: GridWindow, p: GridPoint) =>
    p.x >= w.x && p.x < w.x + w.cols && p.y >= w.y && p.y < w.y + w.rows;

type MapT = ReturnType<typeof useTranslations<'battle.map'>>;

function hazardTitle(
    t: MapT,
    cell: TerrainCell,
    round: number | undefined
): string {
    const label = cell.label ?? t('hazardDefault');

    if (cell.untilRound === undefined) return label;

    return round === undefined
        ? t('hazardUntilEnd', { label, round: cell.untilRound })
        : t('hazardRoundsLeft', {
              label,
              rounds: Math.max(1, cell.untilRound - round + 1),
          });
}

export function terrainTitle(
    t: MapT,
    cell: TerrainCell,
    round: number | undefined
): string | null {
    if (cell.kind === 'barrier')
        return cell.untilRound !== undefined
            ? t('barrierUntil', { round: cell.untilRound })
            : t('barrier');

    if (cell.kind === 'difficult') return cell.label ?? t('difficultDefault');

    return cell.kind === 'hazard' ? hazardTitle(t, cell, round) : null;
}
