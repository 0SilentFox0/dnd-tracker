import { baseDoorsOf } from './effective-map';

import type {
    BattleMapConfig,
    BattleMapRef,
    BattleMapState,
    MapBase,
} from '@/types/battle';

interface MapMeta {
    map: BattleMapConfig | null;
    mapRef?: BattleMapRef | null;
    mapBase?: MapBase | null;
}

const EDGE_KEYS = ['walls', 'bars'] as const;

export function withoutEdges(map: BattleMapConfig): BattleMapConfig {
    if (map.walls === undefined && map.bars === undefined) return map;

    const { walls: _walls, bars: _bars, ...header } = map;

    return header;
}

function withEdges(map: BattleMapConfig, base: MapBase): BattleMapConfig {
    if (EDGE_KEYS.every((key) => map[key] === base[key])) return map;

    const out = { ...map };

    for (const key of EDGE_KEYS) {
        if (base[key] === undefined) delete out[key];
        else out[key] = base[key];
    }

    return out;
}

/** The map as the client holds it: header plus own stored edges, before the state layer is applied. */
export function clientMapOf(meta: MapMeta): BattleMapConfig | null {
    const { map, mapRef, mapBase } = meta;

    if (!map) return map;

    if (mapRef) return withoutEdges(map);

    return mapBase ? withEdges(map, mapBase) : map;
}

/**
 * The map a mutation result must be written as. Edges of a linked map are never stored; for an inline map
 * edges left untouched keep their stored form, and edges removed through state stay subtractable.
 */
export function persistedMap(
    meta: MapMeta,
    patched: BattleMapConfig,
    state: BattleMapState | null | undefined
): BattleMapConfig {
    return withBaseDoors(persistedEdges(meta, patched, state));
}

function withBaseDoors(map: BattleMapConfig): BattleMapConfig {
    const base = baseDoorsOf(map.doors);

    if (base === map.doors) return map;

    const { doors: _doors, ...rest } = map;

    return base ? { ...rest, doors: base } : rest;
}

function persistedEdges(
    meta: MapMeta,
    patched: BattleMapConfig,
    state: BattleMapState | null | undefined
): BattleMapConfig {
    if (meta.mapRef) return withoutEdges(patched);

    const { map: effective, mapBase: base } = meta;

    if (!base || !effective) return patched;

    const removed = new Set(state?.removedEdges);

    const out = { ...patched };

    let changed = false;

    for (const key of EDGE_KEYS) {
        const own = patched[key];

        const value =
            own === effective[key]
                ? base[key]
                : [
                      ...new Set([
                          ...(own ?? []),
                          ...(base[key] ?? []).filter((e) => removed.has(e)),
                      ]),
                  ];

        const drop =
            value === undefined || (value.length === 0 && own === undefined);

        if (drop ? own !== undefined : own !== value) changed = true;

        if (drop) delete out[key];
        else out[key] = value;
    }

    return changed ? out : patched;
}
