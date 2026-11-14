import { MODE_MAP_KEYS } from '@/lib/utils/battle/modes/client';
import type { BattleMapConfig, TerrainCell } from '@/types/battle';

const BATTLE_KEYS: ReadonlySet<string> = new Set([
    'spellZones',
    'weather',
    'motion',
    ...MODE_MAP_KEYS,
]);

const EDGE_KEYS: ReadonlySet<string> = new Set(['walls', 'bars']);

const same = (a: unknown, b: unknown) =>
    a === b || JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const isRuntimeCell = (cell: TerrainCell | undefined) =>
    !!cell && (cell.zoneId !== undefined || cell.untilRound !== undefined);

function mergeTerrain(
    oldLib: BattleMapConfig['terrain'],
    newLib: BattleMapConfig['terrain'],
    battle: BattleMapConfig['terrain']
): BattleMapConfig['terrain'] {
    const keys = new Set([
        ...Object.keys(oldLib ?? {}),
        ...Object.keys(newLib ?? {}),
        ...Object.keys(battle ?? {}),
    ]);

    const out: Record<string, TerrainCell> = {};

    for (const key of keys) {
        const own = battle?.[key];

        const cell =
            isRuntimeCell(own) || same(newLib?.[key], oldLib?.[key])
                ? own
                : newLib?.[key];

        if (cell) out[key] = cell;
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
        if (EDGE_KEYS.has(key) || key === 'terrain') continue;

        const k = key as keyof BattleMapConfig;

        const value = BATTLE_KEYS.has(key)
            ? battle[k]
            : same(newLib[k], oldLib[k])
              ? battle[k]
              : newLib[k];

        if (value !== undefined) out[key] = value;
    }

    const terrain = mergeTerrain(
        oldLib.terrain,
        newLib.terrain,
        battle.terrain
    );

    if (terrain) out.terrain = terrain;

    return out as unknown as BattleMapConfig;
}
