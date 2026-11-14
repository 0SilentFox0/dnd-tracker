import { diffEdges, diffSize } from '@/lib/utils/battle/grid/edge-diff';
import type {
    BattleMapConfig,
    BattleMapState,
    DoorState,
    MapStateDelta,
} from '@/types/battle';

export interface LibraryEdges {
    walls: readonly string[];
    bars: readonly string[];
}

const NO_STATE = {};

const NO_EDGES = {};

const cache = new WeakMap<
    BattleMapConfig,
    WeakMap<object, WeakMap<object, BattleMapConfig>>
>();

function merge(
    own: readonly string[] | undefined,
    lib: readonly string[] | undefined,
    removed: ReadonlySet<string>
): string[] | undefined {
    if (!own?.length && !lib?.length) return own as string[] | undefined;

    if (removed.size === 0) {
        if (!own?.length) return lib as string[];

        if (!lib?.length) return own as string[];
    }

    const out = new Set<string>([...(own ?? []), ...(lib ?? [])]);

    for (const e of removed) out.delete(e);

    return [...out];
}

/** Базова карта + ребра бібліотеки − видалені ребра стану; модові стіни не чіпає. Результат стабільний за ідентичністю входів. */
export function composeEffectiveMap(
    base: BattleMapConfig,
    state: BattleMapState | null | undefined,
    libEdges?: LibraryEdges | null
): BattleMapConfig {
    const removed = state?.removedEdges;

    if (!removed?.length && !libEdges) return base;

    let byState = cache.get(base);

    if (!byState) {
        byState = new WeakMap();
        cache.set(base, byState);
    }

    const stateKey = state ?? NO_STATE;

    let byLib = byState.get(stateKey);

    if (!byLib) {
        byLib = new WeakMap();
        byState.set(stateKey, byLib);
    }

    const libKey = libEdges ?? NO_EDGES;

    let result = byLib.get(libKey);

    if (!result) {
        const gone = new Set(removed);

        result = { ...base };

        const walls = merge(base.walls, libEdges?.walls, gone);

        const bars = merge(base.bars, libEdges?.bars, gone);

        if (walls) result.walls = walls;

        if (bars) result.bars = bars;

        byLib.set(libKey, result);
    }

    return result;
}

export function diffMapState(
    before: BattleMapState | null | undefined,
    after: BattleMapState | null | undefined
): MapStateDelta | null {
    const delta: MapStateDelta = {};

    const removed = diffEdges(before?.removedEdges, after?.removedEdges);

    if (removed) delta.removed = removed;

    const doors: Record<string, DoorState | null> = {};

    const prev = before?.doors ?? {};

    const next = after?.doors ?? {};

    for (const [key, door] of Object.entries(next)) {
        const old = prev[key];

        if (!old || old.open !== door.open || old.locked !== door.locked) {
            doors[key] = door;
        }
    }

    for (const key of Object.keys(prev)) if (!(key in next)) doors[key] = null;

    if (Object.keys(doors).length) delta.doors = doors;

    return delta.removed || delta.doors ? delta : null;
}

/** Drops removals whose edge fails `keep`; returns the same reference when nothing is dropped. */
export function pruneRemoved(
    state: BattleMapState | null | undefined,
    keep: (edge: string) => boolean
): BattleMapState | null | undefined {
    if (!state) return state;

    const removedEdges = state.removedEdges.filter(keep);

    return removedEdges.length === state.removedEdges.length
        ? state
        : { ...state, removedEdges };
}

export function applyMapStateDelta(
    state: BattleMapState | null | undefined,
    delta: MapStateDelta
): BattleMapState {
    if (
        state &&
        diffSize(delta.removed) === 0 &&
        Object.keys(delta.doors ?? {}).length === 0
    )
        return state;

    const removed = new Set(state?.removedEdges);

    for (const e of delta.removed?.remove ?? []) removed.delete(e);

    for (const e of delta.removed?.add ?? []) removed.add(e);

    const doors = { ...state?.doors };

    for (const [key, door] of Object.entries(delta.doors ?? {})) {
        if (door === null) delete doors[key];
        else doors[key] = door;
    }

    return {
        ...state,
        removedEdges: [...removed],
        doors,
    };
}
