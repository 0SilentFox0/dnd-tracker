import { cellLine } from './geometry';
import { cornerOpen, edgeKey, wallSet } from './walls';

import { collectModifiers } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import { modeWalls } from '@/lib/utils/battle/modes/engine';
import type {
    BattleMapConfig,
    BattleParticipant,
    GridPoint,
} from '@/types/battle';

export type EdgeKind = 'move' | 'sight' | 'fire';

type EdgeMap = BattleMapConfig;

interface Joined {
    list: readonly string[];
    set: ReadonlySet<string>;
}

const joinCache = new WeakMap<
    readonly string[],
    WeakMap<readonly string[], Joined>
>();

const closedCache = new WeakMap<object, readonly string[]>();

const moveCache = new WeakMap<
    readonly string[],
    WeakMap<ReadonlySet<string>, ReadonlySet<string>>
>();

const EMPTY: readonly string[] = [];

/** Зачинені (не `open`) двері: блокують як стіни; стабільне посилання за ідентичністю `map.doors`. */
export function closedDoorsOf(
    map: Pick<BattleMapConfig, 'doors'>
): readonly string[] {
    const { doors } = map;

    if (!doors) return EMPTY;

    let list = closedCache.get(doors);

    if (!list) {
        list = Object.keys(doors).filter((edge) => doors[edge].open !== true);

        closedCache.set(doors, list);
    }

    return list;
}

function join(base: Joined, extra: readonly string[]): Joined {
    if (!extra.length) return base;

    if (!base.set.size) return { list: extra, set: wallSet(extra as string[]) };

    let byExtra = joinCache.get(base.list);

    if (!byExtra) {
        byExtra = new WeakMap();
        joinCache.set(base.list, byExtra);
    }

    let joined = byExtra.get(extra);

    if (!joined) {
        const set = new Set([...base.set, ...extra]);

        joined = { list: [...set], set };
        byExtra.set(extra, joined);
    }

    return joined;
}

export function wallsOf(map: EdgeMap): ReadonlySet<string> {
    const own = wallSet(map.walls);

    const mode = modeWalls(map);

    const closed = closedDoorsOf(map);

    if (!mode.length && !closed.length) return own;

    const base: Joined = { list: map.walls ?? EMPTY, set: own };

    return join(join(base, mode), closed).set;
}

export function barsOf(
    map: Pick<BattleMapConfig, 'bars'>
): ReadonlySet<string> {
    return wallSet(map.bars);
}

function blockingSet(map: EdgeMap, kind: EdgeKind): ReadonlySet<string> {
    const walls = wallsOf(map);

    if (kind !== 'move') return walls;

    const barsList = map.bars;

    if (!barsList?.length) return walls;

    let byWalls = moveCache.get(barsList);

    if (!byWalls) {
        byWalls = new WeakMap();
        moveCache.set(barsList, byWalls);
    }

    let union = byWalls.get(walls);

    if (!union) {
        union = new Set([...walls, ...barsList]);
        byWalls.set(walls, union);
    }

    return union;
}

export function passesWalls(mover?: BattleParticipant): boolean {
    return (
        !!mover &&
        collectModifiers([mover], mover.basicInfo.id, { flag: 'passesWalls' })
            .entries.length > 0
    );
}

/** Блокує перехід між сусідніми клітинками (діагональ — якщо закритий хоч один кутовий шлях). */
export function edgeBlocks(
    map: EdgeMap,
    a: GridPoint,
    b: GridPoint,
    kind: EdgeKind,
    mover?: BattleParticipant
): boolean {
    const set = blockingSet(map, kind);

    if (!set.size) return false;

    const blocked = edgeBlocksPlain(map, set, a, b);

    return blocked && kind === 'move' && mover ? !passesWalls(mover) : blocked;
}

function edgeBlocksPlain(
    map: EdgeMap,
    set: ReadonlySet<string>,
    a: GridPoint,
    b: GridPoint
): boolean {
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
