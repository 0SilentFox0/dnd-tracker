import { cellLine } from './geometry';
import { cornerOpen, edgeKey, wallSet } from './walls';

import { modeWalls } from '@/lib/utils/battle/modes/engine';
import type {
    BattleMapConfig,
    BattleParticipant,
    GridPoint,
} from '@/types/battle';

export type EdgeKind = 'move' | 'sight' | 'fire';

type EdgeMap = BattleMapConfig;

const wallsCache = new WeakMap<
    object,
    WeakMap<readonly string[], ReadonlySet<string>>
>();

const EMPTY: readonly string[] = [];

export function wallsOf(map: EdgeMap): ReadonlySet<string> {
    const own = wallSet(map.walls);

    const mode = modeWalls(map);

    if (!mode.length) return own;

    if (!own.size) return wallSet(mode as string[]);

    const ownList = map.walls ?? EMPTY;

    let byMode = wallsCache.get(ownList);

    if (!byMode) {
        byMode = new WeakMap();
        wallsCache.set(ownList, byMode);
    }

    let union = byMode.get(mode);

    if (!union) {
        union = new Set([...own, ...mode]);
        byMode.set(mode, union);
    }

    return union;
}

export function barsOf(map: Pick<BattleMapConfig, 'bars'>): ReadonlySet<string> {
    return wallSet(map.bars);
}

function blockingSet(map: EdgeMap, kind: EdgeKind): ReadonlySet<string> {
    const walls = wallsOf(map);

    if (kind !== 'move') return walls;

    const bars = barsOf(map);

    return bars.size ? new Set([...walls, ...bars]) : walls;
}

/** Блокує перехід між сусідніми клітинками (діагональ — якщо закритий хоч один кутовий шлях). */
export function edgeBlocks(
    map: EdgeMap,
    a: GridPoint,
    b: GridPoint,
    kind: EdgeKind,
    _mover?: BattleParticipant
): boolean {
    const set = blockingSet(map, kind);

    if (!set.size) return false;

    const dx = Math.abs(b.x - a.x);

    const dy = Math.abs(b.y - a.y);

    if (dx + dy === 0) return false;

    if (dx + dy === 1) {
        const key = edgeKey(a, b);

        return key !== null && set.has(key);
    }

    if (dx === 1 && dy === 1) return !cornerOpen(map, set, a, b);

    return false;
}

/** Чи є хоч одна пара клітинок (з `from` у `to`) по прямій лінії без блокуючих ребер. */
export function cellsConnected(
    map: EdgeMap,
    kind: EdgeKind,
    fromCells: GridPoint[],
    toCells: GridPoint[]
): boolean {
    for (const from of fromCells) {
        for (const to of toCells) {
            const line = cellLine(from, to);

            let clear = true;

            for (let i = 1; i < line.length; i++) {
                if (edgeBlocks(map, line[i - 1], line[i], kind)) {
                    clear = false;
                    break;
                }
            }

            if (clear) return true;
        }
    }

    return false;
}
