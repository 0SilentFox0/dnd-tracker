import { ParticipantSide } from '@/lib/constants/battle';
import { CONTROLLED_BY_DM } from '@/lib/constants/characters';
import { MAP_LIMITS } from '@/lib/constants/map-limits';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import type {
    BattleMapConfig,
    BattleParticipant,
    TerrainCell,
} from '@/types/battle';

export const SIDES = [60, 100, 200] as const;

export const DM_ID = 'dm-user';

function rng(seed: number) {
    let s = seed >>> 0;

    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;

        return s / 2 ** 32;
    };
}

const TERRAIN: TerrainCell[] = [
    { kind: 'wall' },
    { kind: 'difficult' },
    { kind: 'hazard', damage: { dice: '1d6', type: 'fire' } },
    { kind: 'hazard', zoneId: 'fog', obscured: true },
];

/** Synthetic n×n map: 2-cell blocked margin, ~5% terrain (capped by maxTerrainCells), ~2n wall edges. */
export function syntheticMap(n: number): BattleMapConfig {
    const rand = rng(n);

    const blocked: string[] = [];

    for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++)
            if (x < 2 || y < 2 || x >= n - 2 || y >= n - 2)
                blocked.push(`${x}:${y}`);

    const terrain: Record<string, TerrainCell> = {};

    const target = Math.min(
        MAP_LIMITS.maxTerrainCells,
        Math.round(n * n * 0.05)
    );

    while (Object.keys(terrain).length < target) {
        const x = 2 + Math.floor(rand() * (n - 4));

        const y = 2 + Math.floor(rand() * (n - 4));

        terrain[`${x}:${y}`] = TERRAIN[Math.floor(rand() * TERRAIN.length)];
    }

    const walls = new Set<string>();

    while (walls.size < n * 2) {
        const x = 2 + Math.floor(rand() * (n - 5));

        const y = 2 + Math.floor(rand() * (n - 5));

        walls.add(`${x}:${y}:${rand() < 0.5 ? 'e' : 's'}`);
    }

    return {
        cols: n,
        rows: n,
        background: null,
        opacity: 0.5,
        blocked,
        terrain,
        walls: [...walls],
    };
}

/** 8 heroes + 8 DM enemies around the map centre on cells free of terrain. */
export function syntheticParticipants(
    map: BattleMapConfig
): BattleParticipant[] {
    const c = Math.floor(map.cols / 2);

    const list: BattleParticipant[] = [];

    for (let i = 0; i < 16; i++) {
        const enemy = i >= 8;

        let x = c + (enemy ? 3 : -3);

        const y = c - 4 + (i % 8);

        while (map.terrain?.[`${x}:${y}`]) x += enemy ? 1 : -1;

        const base = createMockParticipant();

        list.push({
            ...base,
            basicInfo: {
                ...base.basicInfo,
                id: `p${i}`,
                side: enemy ? ParticipantSide.ENEMY : ParticipantSide.ALLY,
                controlledBy: enemy ? CONTROLLED_BY_DM : `user-${i}`,
            },
            battleData: { ...base.battleData, position: { x, y } },
        });
    }

    return list;
}

export function stats(samples: number[]) {
    const sorted = [...samples].sort((a, b) => a - b);

    return {
        median: sorted[Math.floor(sorted.length / 2)],
        max: sorted[sorted.length - 1],
    };
}

export function time(fn: () => unknown, runs: number) {
    fn();

    const samples: number[] = [];

    for (let i = 0; i < runs; i++) {
        const t0 = performance.now();

        fn();
        samples.push(performance.now() - t0);
    }

    return stats(samples);
}

export const ms = (v: number) => Math.round(v * 100) / 100;
