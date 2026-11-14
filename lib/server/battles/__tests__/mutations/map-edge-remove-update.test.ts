import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getMap: vi.fn() }));

vi.mock('@/lib/server/battle-maps/library-service', () => ({
    getMap: mocks.getMap,
}));

import { context, goblin, hero } from './fixtures';

import { mapEdgeRemoveMutation } from '@/lib/server/battles/mutations/map-edge-remove/map-edge-remove-mutation';
import { mapUpdateMutation } from '@/lib/server/battles/mutations/map-update/map-update-mutation';
import { mapWallsMutation } from '@/lib/server/battles/mutations/map-walls/map-walls-mutation';
import { REJECT } from '@/lib/utils/battle/store/reject';
import type { BattleMapConfig, BattleMapState } from '@/types/battle';

const map: BattleMapConfig = {
    cols: 8,
    rows: 8,
    background: null,
    opacity: 0.3,
    walls: ['1:1:e', '2:2:s'],
    bars: ['3:3:e'],
};

const ctxWith = (
    mapState: BattleMapState | null,
    over: Record<string, unknown> = {}
) => {
    const base = context({ isDM: true });

    return {
        ...base,
        meta: { ...base.meta, map, mapState, ...over },
    };
};

const rejected = (key: string) => expect.objectContaining({ message: key });

describe('map-edge-remove', () => {
    it('remove: пише patch.mapState, карту не чіпає', () => {
        const out = mapEdgeRemoveMutation(ctxWith(null), {
            edges: ['1:1:e', '3:3:e'],
        });

        expect(out.scene?.mapState?.removedEdges).toEqual(['1:1:e', '3:3:e']);
        expect(out.scene).not.toHaveProperty('map');
    });

    it('remove/restore: одна dm-подія з лог-ключем і count', () => {
        const removed = mapEdgeRemoveMutation(ctxWith(null), {
            edges: ['1:1:e', '3:3:e'],
        });

        expect(removed.events).toHaveLength(1);
        expect(JSON.stringify(removed.events[0])).toContain(
            'battleLog.dm.edgesRemoved'
        );
        expect(JSON.stringify(removed.events[0])).toContain('"count":2');

        const restored = mapEdgeRemoveMutation(
            ctxWith({ removedEdges: ['1:1:e'], doors: {} }),
            { edges: ['1:1:e'], restore: true }
        );

        expect(JSON.stringify(restored.events[0])).toContain(
            'battleLog.dm.edgesRestored'
        );
    });

    it('remove: нема такого ребра — mapEdgeNotFound', () => {
        expect(() =>
            mapEdgeRemoveMutation(ctxWith(null), { edges: ['7:7:e'] })
        ).toThrow(rejected(REJECT.mapEdgeNotFound));
    });

    it('restore: повертає лише видалені, інакше mapEdgeNotRemoved', () => {
        const state = { removedEdges: ['1:1:e', '3:3:e'], doors: {} };

        const out = mapEdgeRemoveMutation(ctxWith(state), {
            edges: ['1:1:e'],
            restore: true,
        });

        expect(out.scene?.mapState?.removedEdges).toEqual(['3:3:e']);

        expect(() =>
            mapEdgeRemoveMutation(ctxWith(state), {
                edges: ['2:2:s'],
                restore: true,
            })
        ).toThrow(rejected(REJECT.mapEdgeNotRemoved));
    });
});

describe('map-walls поверх видаленого ребра', () => {
    it('додавання знімає ребро зі стану', () => {
        const state = { removedEdges: ['1:1:e', '3:3:e'], doors: {} };

        const effective = {
            ...map,
            walls: ['2:2:s'],
            bars: [] as string[],
        };

        const out = mapWallsMutation(ctxWith(state, { map: effective }), {
            kind: 'walls',
            add: ['1:1:e'],
            remove: [],
        });

        expect(out.scene?.map?.walls).toContain('1:1:e');
        expect(out.scene?.mapState?.removedEdges).toEqual(['3:3:e']);
    });
});

describe('map-update', () => {
    const library = (over: Record<string, unknown> = {}) => ({
        version: 4,
        cols: 8,
        rows: 8,
        map: { cols: 8, rows: 8, background: null, opacity: 0.5 },
        walls: ['2:2:s'],
        bars: [],
        ...over,
    });

    const linked = (state: BattleMapState | null = null) =>
        ctxWith(state, {
            map: {
                cols: 8,
                rows: 8,
                background: null,
                opacity: 0.3,
                terrain: { '0:0': { kind: 'hazard' } },
                weather: 'rain',
            },
            mapRef: { mapId: 'm1', version: 3 },
        });

    beforeEach(() => mocks.getMap.mockReset());

    it('не linked — mapNotLinked', async () => {
        await expect(mapUpdateMutation(ctxWith(null), {})).rejects.toEqual(
            rejected(REJECT.mapNotLinked)
        );
    });

    it('та сама версія — без патчу', async () => {
        mocks.getMap.mockResolvedValue(library({ version: 3 }));

        const out = await mapUpdateMutation(linked(), {});

        expect(out.scene).toBeUndefined();
        expect(out.events).toEqual([]);
    });

    it('нова версія: шапка, runtime-поля збережені, mapRef, prune стану', async () => {
        mocks.getMap.mockResolvedValue(library());

        const out = await mapUpdateMutation(
            linked({ removedEdges: ['1:1:e', '2:2:s'], doors: {} }),
            {}
        );

        expect(out.events).toHaveLength(1);
        expect(JSON.stringify(out.events[0])).toContain(
            'battleLog.dm.mapUpdated'
        );
        expect(out.scene?.mapRef).toEqual({ mapId: 'm1', version: 4 });
        expect(out.scene?.map).toMatchObject({
            opacity: 0.5,
            weather: 'rain',
            terrain: { '0:0': { kind: 'hazard' } },
        });
        expect(out.scene?.mapState?.removedEdges).toEqual(['2:2:s']);
        expect(out.scene?.map?.walls).toEqual([]);
    });

    it('учасник на клітинці, що стала недоступною — mapUpdateCollision з іменами', async () => {
        mocks.getMap.mockResolvedValue(
            library({
                map: {
                    cols: 8,
                    rows: 8,
                    background: null,
                    opacity: 0.5,
                    blocked: ['1:1'],
                },
            })
        );

        const placed = {
            ...goblin,
            battleData: { ...goblin.battleData, position: { x: 1, y: 1 } },
        };

        const ctx = { ...linked(), participants: [hero, placed] };

        await expect(mapUpdateMutation(ctx, {})).rejects.toMatchObject({
            message: REJECT.mapUpdateCollision,
            params: { names: 'Гоблін' },
        });
    });

    it('зменшена карта: прибирає місцевість і зони поза межами, двері зниклих ребер', async () => {
        mocks.getMap.mockResolvedValue(
            library({
                cols: 4,
                rows: 4,
                map: { cols: 4, rows: 4, background: null, opacity: 0.5 },
                walls: ['1:1:e'],
            })
        );

        const spellZone = {
            casterId: 'x',
            spellId: 's',
            spellName: 'S',
            side: 'all' as const,
            triggers: {},
            untilRound: 3,
        };

        const ctx = linked({
            removedEdges: [],
            doors: {
                '1:1:e': { open: true, locked: false },
                '6:6:e': { open: false, locked: false },
            },
        });

        ctx.meta.map = {
            ...ctx.meta.map!,
            cols: 8,
            rows: 8,
            terrain: {
                '1:1': { kind: 'hazard', zoneId: 'in' },
                '6:6': { kind: 'hazard', zoneId: 'out' },
            },
            spellZones: { in: spellZone, out: spellZone },
        };

        const out = await mapUpdateMutation(ctx, {});

        expect(Object.keys(out.scene!.map!.terrain!)).toEqual(['1:1']);
        expect(Object.keys(out.scene!.map!.spellZones!)).toEqual(['in']);
        expect(Object.keys(out.scene!.mapState!.doors)).toEqual(['1:1:e']);
    });
});
