import { inBounds, parseCellKey } from '@/lib/utils/battle/grid';
import { parseEdgeKey } from '@/lib/utils/battle/grid/walls';
import { MODE_MAP_KEYS } from '@/lib/utils/battle/modes/client';
import type { BattleMapConfig, TerrainCell } from '@/types/battle-grid';

const BATTLE_KEYS: ReadonlySet<string> = new Set([
    'spellZones',
    'weather',
    'motion',
    ...MODE_MAP_KEYS,
]);

const EDGE_KEYS: ReadonlySet<string> = new Set(['walls', 'bars']);

const KEYED_KEYS: ReadonlySet<string> = new Set(['terrain', 'doors']);

const same = (a: unknown, b: unknown) =>
    a === b || JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const isRuntimeCell = (cell: TerrainCell | undefined) =>
    !!cell && (cell.zoneId !== undefined || cell.untilRound !== undefined);

function mergeKeyed<T>(
    oldLib: Record<string, T> | undefined,
    newLib: Record<string, T> | undefined,
    battle: Record<string, T> | undefined,
    keepBattle: (own: T | undefined) => boolean = () => false
): Record<string, T> | undefined {
    const keys = new Set([
        ...Object.keys(oldLib ?? {}),
        ...Object.keys(newLib ?? {}),
        ...Object.keys(battle ?? {}),
    ]);

    const out: Record<string, T> = {};

    for (const key of keys) {
        const own = battle?.[key];

        const value =
            keepBattle(own) || same(newLib?.[key], oldLib?.[key])
                ? own
                : newLib?.[key];

        if (value) out[key] = value;
    }

    return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Three-way merge of a library header into a battle's pinned copy: a field the library did not change keeps the
 * battle value (DM edits survive), a changed one takes the library value. Runtime layers always stay with the battle.
 */
export function mergeLibraryHeader(
    oldLib: BattleMapConfig,
    newLib: BattleMapConfig,
    battle: BattleMapConfig
): BattleMapConfig {
    const keys = new Set([
        ...Object.keys(oldLib),
        ...Object.keys(newLib),
        ...Object.keys(battle),
    ]);

    const out: Record<string, unknown> = {};

    for (const key of keys) {
        if (EDGE_KEYS.has(key) || KEYED_KEYS.has(key)) continue;

        const k = key as keyof BattleMapConfig;

        const value = BATTLE_KEYS.has(key)
            ? battle[k]
            : same(newLib[k], oldLib[k])
              ? battle[k]
              : newLib[k];

        if (value !== undefined) out[key] = value;
    }

    const terrain = mergeKeyed(
        oldLib.terrain,
        newLib.terrain,
        battle.terrain,
        isRuntimeCell
    );

    if (terrain) out.terrain = terrain;

    const doors = mergeKeyed(oldLib.doors, newLib.doors, battle.doors);

    if (doors) out.doors = doors;

    return out as unknown as BattleMapConfig;
}

function pruneDoors(map: BattleMapConfig): BattleMapConfig {
    if (!map.doors) return map;

    const entries = Object.entries(map.doors).filter(([edge]) => {
        const { a, b } = parseEdgeKey(edge);

        return inBounds(map, a) && inBounds(map, b);
    });

    return entries.length === Object.keys(map.doors).length
        ? map
        : { ...map, doors: Object.fromEntries(entries) };
}

/** Terrain cells and doors outside the new bounds go, and zones that lose their last cell with them. */
export function pruneOutOfBounds(source: BattleMapConfig): BattleMapConfig {
    const map = pruneDoors(source);

    if (!map.terrain) return map;

    const entries = Object.entries(map.terrain);

    const kept = entries.filter(([key]) => inBounds(map, parseCellKey(key)));

    if (kept.length === entries.length) return map;

    const alive = new Set(kept.flatMap(([, cell]) => cell.zoneId ?? []));

    const lost = new Set(
        entries.flatMap(([, cell]) =>
            cell.zoneId && !alive.has(cell.zoneId) ? [cell.zoneId] : []
        )
    );

    const { spellZones } = map;

    return {
        ...map,
        terrain: Object.fromEntries(kept),
        ...(spellZones && {
            spellZones: Object.fromEntries(
                Object.entries(spellZones).filter(([id]) => !lost.has(id))
            ),
        }),
    };
}
