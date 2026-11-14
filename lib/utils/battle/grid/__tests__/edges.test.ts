import { afterEach, describe, expect, it } from 'vitest';

import { barsOf,cellsConnected, edgeBlocks, wallsOf } from '../edges';

import { testMap } from '@/lib/utils/battle/__tests__/fixtures/placed';
import type { MapModeDefinition } from '@/lib/utils/battle/modes';
import { registerTestMode } from '@/lib/utils/battle/modes';
import type { BattleMapConfig } from '@/types/battle';

const at = (x: number, y: number) => ({ x, y });

const mapWith = (over: Partial<BattleMapConfig>) => testMap(6, 6, over);

describe('edgeBlocks', () => {
    const map = mapWith({ walls: ['2:2:e'], bars: ['3:3:s'] });

    it('стіна блокує move/sight/fire', () => {
        for (const kind of ['move', 'sight', 'fire'] as const) {
            expect(edgeBlocks(map, at(2, 2), at(3, 2), kind)).toBe(true);
            expect(edgeBlocks(map, at(3, 2), at(2, 2), kind)).toBe(true);
        }
    });

    it('ґрати блокують лише move', () => {
        expect(edgeBlocks(map, at(3, 3), at(3, 4), 'move')).toBe(true);
        expect(edgeBlocks(map, at(3, 3), at(3, 4), 'sight')).toBe(false);
        expect(edgeBlocks(map, at(3, 3), at(3, 4), 'fire')).toBe(false);
    });

    it('діагональ закрита через кутове ребро', () => {
        expect(edgeBlocks(map, at(2, 1), at(3, 2), 'move')).toBe(true);
        expect(edgeBlocks(map, at(0, 0), at(1, 1), 'move')).toBe(false);
    });

    it('без стін і на тій самій клітинці — false', () => {
        expect(edgeBlocks(mapWith({}), at(0, 0), at(1, 0), 'move')).toBe(false);
        expect(edgeBlocks(map, at(2, 2), at(2, 2), 'move')).toBe(false);
    });
});

describe('wallsOf / barsOf', () => {
    let off: (() => void) | undefined;

    afterEach(() => off?.());

    it('без режиму повертає map.walls; barsOf — map.bars', () => {
        const map = mapWith({ walls: ['0:0:e'], bars: ['1:1:s'] });

        expect([...wallsOf(map)]).toEqual(['0:0:e']);
        expect([...barsOf(map)]).toEqual(['1:1:s']);
        expect(wallsOf(mapWith({})).size).toBe(0);
    });

    it('об’єднує map.walls із ребрами режиму і мемоізує', () => {
        const modeList = ['4:4:e'];

        type Cfg = { on: true };

        const mode = {
            key: 'walls-fake',
            configOf: (m: BattleMapConfig) =>
                (m as { wf?: Cfg | null }).wf ?? null,
            withConfig: (m: BattleMapConfig, wf: Cfg | null) =>
                ({ ...m, wf }) as BattleMapConfig,
            server: {},
            engine: { walls: () => modeList },
            client: {},
        };

        off = registerTestMode(mode as unknown as MapModeDefinition<unknown>);

        const map = {
            ...mapWith({ walls: ['0:0:e'] }),
            wf: { on: true },
        } as BattleMapConfig;

        const set = wallsOf(map);

        expect([...set].sort()).toEqual(['0:0:e', '4:4:e']);
        expect(wallsOf(map)).toBe(set);
        expect(edgeBlocks(map, at(4, 4), at(5, 4), 'fire')).toBe(true);
    });
});

describe('cellsConnected', () => {
    const map = mapWith({ walls: ['2:0:e', '2:1:e'], bars: ['2:2:e'] });

    it('стіна розриває зв’язок, а в обхід — ні', () => {
        expect(cellsConnected(map, 'sight', [at(2, 0)], [at(3, 0)])).toBe(false);
        expect(cellsConnected(map, 'sight', [at(2, 3)], [at(3, 3)])).toBe(true);
    });

    it('ґрати розривають move, але не sight', () => {
        expect(cellsConnected(map, 'move', [at(2, 2)], [at(3, 2)])).toBe(false);
        expect(cellsConnected(map, 'sight', [at(2, 2)], [at(3, 2)])).toBe(true);
    });

    it('footprint: достатньо однієї вільної пари', () => {
        expect(
            cellsConnected(
                map,
                'sight',
                [at(2, 0), at(2, 3)],
                [at(3, 0), at(3, 3)]
            )
        ).toBe(true);
    });
});
