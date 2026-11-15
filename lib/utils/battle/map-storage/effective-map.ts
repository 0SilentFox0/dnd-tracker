import { FOG_DEFAULT_VISION_RADIUS } from '@/lib/utils/battle/fog/constants';
import {
    addRevealedRuns,
    diffRevealedRuns,
    removeRevealedRuns,
} from '@/lib/utils/battle/fog/revealed-runs';
import { diffEdges, diffSize } from '@/lib/utils/battle/grid/edge-diff';
import type {
    BattleMapConfig,
    BattleMapState,
    DoorState,
    FogState,
    MapStateDelta,
} from '@/types/battle';

export interface LibraryEdges {
    walls: readonly string[];
    bars: readonly string[];
}

const NO_STATE = {};

const NO_EDGES = {};

const DEFAULT_FOG: FogState = {
    mode: 'off',
    revealed: [],
    visionRadius: FOG_DEFAULT_VISION_RADIUS,
};

/** Effective `doors` object → the base `doors` it was composed from, so persistence can store the base back. */
const doorsOrigin = new WeakMap<
    object,
    Record<string, DoorState> | undefined
>();

export function baseDoorsOf(
    doors: BattleMapConfig['doors']
): BattleMapConfig['doors'] {
    return doors && doorsOrigin.has(doors) ? doorsOrigin.get(doors) : doors;
}

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

function composeDoors(
    base: Record<string, DoorState> | undefined,
    state: BattleMapState | null | undefined,
    removed: ReadonlySet<string>
): Record<string, DoorState> | undefined {
    if (!base) return base;

    const overlay = state?.doors;

    if (!removed.size && !overlay) return base;

    const out: Record<string, DoorState> = {};

    for (const [edge, door] of Object.entries(base)) {
        if (!removed.has(edge)) out[edge] = overlay?.[edge] ?? door;
    }

    doorsOrigin.set(out, base);

    return out;
}

const hasDoorState = (state: BattleMapState | null | undefined) =>
    !!state && Object.keys(state.doors ?? {}).length > 0;

/** Базова карта + ребра бібліотеки − видалені ребра стану; двері бази поверх яких лежить стан (виламані зникають); модові стіни не чіпає. Результат стабільний за ідентичністю входів. */
export function composeEffectiveMap(
    base: BattleMapConfig,
    state: BattleMapState | null | undefined,
    libEdges?: LibraryEdges | null
): BattleMapConfig {
    const removed = state?.removedEdges;

    if (!removed?.length && !libEdges && !hasDoorState(state)) return base;

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

        const doors = composeDoors(base.doors, state, gone);

        if (doors) result.doors = doors;

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

    const prevFog = before?.fog ?? DEFAULT_FOG;

    const nextFog = after?.fog ?? DEFAULT_FOG;

    const revealed = diffRevealedRuns(prevFog.revealed, nextFog.revealed);

    const fog: NonNullable<MapStateDelta['fog']> = {};

    if (prevFog.mode !== nextFog.mode) fog.mode = nextFog.mode;

    if (prevFog.visionRadius !== nextFog.visionRadius)
        fog.visionRadius = nextFog.visionRadius;

    if (revealed.add.length || revealed.remove.length)
        fog.revealed = revealed;

    if (Object.keys(fog).length) delta.fog = fog;

    return delta.removed || delta.doors || delta.fog ? delta : null;
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
    const prevFog = state?.fog ?? DEFAULT_FOG;

    const fogDelta = delta.fog;

    const fogIsEmpty =
        !fogDelta ||
        ((fogDelta.mode === undefined || fogDelta.mode === prevFog.mode) &&
            (fogDelta.visionRadius === undefined ||
                fogDelta.visionRadius === prevFog.visionRadius) &&
            (fogDelta.revealed?.add.length ?? 0) === 0 &&
            (fogDelta.revealed?.remove.length ?? 0) === 0);

    if (state && diffSize(delta.removed) === 0 && !Object.keys(delta.doors ?? {}).length && fogIsEmpty)
        return state;

    const removed = new Set(state?.removedEdges);

    for (const e of delta.removed?.remove ?? []) removed.delete(e);

    for (const e of delta.removed?.add ?? []) removed.add(e);

    const doors = { ...state?.doors };

    for (const [key, door] of Object.entries(delta.doors ?? {})) {
        if (door === null) delete doors[key];
        else doors[key] = door;
    }

    const fog = fogDelta
        ? {
              mode: fogDelta.mode ?? prevFog.mode,
              visionRadius: fogDelta.visionRadius ?? prevFog.visionRadius,
              revealed: addRevealedRuns(
                  removeRevealedRuns(
                      prevFog.revealed,
                      fogDelta.revealed?.remove ?? []
                  ),
                  fogDelta.revealed?.add ?? []
              ),
          }
        : state?.fog;

    return {
        ...state,
        removedEdges: [...removed],
        doors,
        ...(fog && { fog }),
    };
}
