import {
    DEFAULT_HAZARD_DAMAGE_TYPE,
    DEFAULT_HAZARD_DICE,
} from '@/lib/constants/battle';
import { type EdgeTool, hazardDamage } from '@/lib/utils/battle/grid';
import type { MapTerrainData } from '@/types/api';
import type { TerrainKind } from '@/types/battle-grid';

export type EdgeBrush = Exclude<EdgeTool, 'edge-door'>;

export type StateBrush = 'edge-break' | 'edge-restore';

export type TerrainBrush =
    | TerrainKind
    | 'erase'
    | 'erase-zone'
    | EdgeBrush
    | StateBrush;

export const isEdgeBrush = (
    kind: TerrainBrush
): kind is EdgeBrush | StateBrush => kind.startsWith('edge-');

export const MAX_STROKE_CELLS = 400;

export const MAX_BARRIER_ROUNDS = 20;

export interface TerrainBrushSettings {
    kind: TerrainBrush;
    rounds: number;
    label: string;
    /** порожньо — небезпека без шкоди */
    dice: string;
    damageType: string;
}

export const DEFAULT_BRUSH: TerrainBrushSettings = {
    kind: 'wall',
    rounds: 1,
    label: '',
    dice: DEFAULT_HAZARD_DICE,
    damageType: DEFAULT_HAZARD_DAMAGE_TYPE,
};

const sameTerrain = (a: MapTerrainData, b: MapTerrainData) =>
    JSON.stringify([a.terrain, a.eraseZone]) ===
    JSON.stringify([b.terrain, b.eraseZone]);

export function enqueue(queue: MapTerrainData[], next: MapTerrainData) {
    const last = queue.at(-1);

    if (last && sameTerrain(last, next)) {
        const merged = [...new Set([...last.cells, ...next.cells])];

        if (merged.length <= MAX_STROKE_CELLS) {
            last.cells = merged;

            return;
        }
    }

    for (let i = 0; i < next.cells.length; i += MAX_STROKE_CELLS)
        queue.push({
            ...next,
            cells: next.cells.slice(i, i + MAX_STROKE_CELLS),
        });
}

export function terrainOfBrush(
    b: TerrainBrush,
    {
        rounds: r,
        label: l,
        dice: d,
        damageType: t,
    }: Pick<TerrainBrushSettings, 'rounds' | 'label' | 'dice' | 'damageType'>
): MapTerrainData['terrain'] {
    const damage = hazardDamage(d, t);

    return b === 'erase' || b === 'erase-zone'
        ? null
        : b === 'barrier'
          ? {
                kind: b,
                rounds: Math.min(
                    MAX_BARRIER_ROUNDS,
                    Math.max(1, Math.trunc(r) || 1)
                ),
            }
          : b === 'hazard'
            ? {
                  kind: b,
                  ...(l.trim() && { label: l.trim() }),
                  ...(damage && { damage }),
              }
            : { kind: b };
}
