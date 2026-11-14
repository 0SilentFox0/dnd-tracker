import { beforeEach, describe, expect, it, vi } from 'vitest';

import { context, goblin, hero } from './fixtures';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { BattleStatus, MAP_EDGES_PER_OP } from '@/lib/constants/battle';
import { mapWallsSchema } from '@/lib/schemas/battles';
import { mapWallsMutation } from '@/lib/server/battles/mutations/map-walls/map-walls-mutation';
import { allInteriorEdges } from '@/lib/utils/battle/grid';
import { mazeMap } from '@/lib/utils/battle/modes/maze/__tests__/fixtures';
import { BattleAccess } from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { BattleRuleError } from '@/lib/utils/battle/store';
import { REJECT } from '@/lib/utils/battle/store/reject';
import type { BattleMapConfig } from '@/types/battle';

const runBattleMutation = vi.hoisted(() => vi.fn());

vi.mock('@/lib/server/battles/run-mutation', () => ({ runBattleMutation }));

const map: BattleMapConfig = {
    cols: 10,
    rows: 5,
    background: null,
    opacity: 0.3,
    walls: ['1:1:e'],
};

const ctx = (m: BattleMapConfig | null = map) => {
    const base = context({ participants: [hero, goblin], isDM: true });

    return { ...base, meta: { ...base.meta, map: m } };
};

describe('map-walls schema', () => {
    it('kind обовʼязковий, ліміт ребер за операцію, хоч одна зміна', () => {
        expect(
            mapWallsSchema.safeParse({
                kind: 'walls',
                add: ['1:1:e'],
                remove: [],
            }).success
        ).toBe(true);
        expect(
            mapWallsSchema.safeParse({
                kind: 'floor',
                add: ['1:1:e'],
                remove: [],
            }).success
        ).toBe(false);
        expect(
            mapWallsSchema.safeParse({ kind: 'bars', add: [], remove: [] })
                .success
        ).toBe(false);
        expect(
            mapWallsSchema.safeParse({
                kind: 'bars',
                add: allInteriorEdges({ cols: 30, rows: 30 }).slice(
                    0,
                    MAP_EDGES_PER_OP + 1
                ),
                remove: [],
            }).success
        ).toBe(false);
    });
});

describe('map-walls mutation', () => {
    it('додає й знімає стіни, решту карти не чіпає', () => {
        const c = ctx();

        const out = mapWallsMutation(c, {
            kind: 'walls',
            add: ['2:2:s'],
            remove: ['1:1:e'],
        });

        expect(out.scene?.map).toEqual({ ...map, walls: ['2:2:s'] });
        expect(out.events).toEqual([]);
        expect(out.participants).toBe(c.participants);
    });

    it('ґрати на ребрі зі стіною замінюють її', () => {
        const out = mapWallsMutation(ctx(), {
            kind: 'bars',
            add: ['1:1:e'],
            remove: [],
        });

        expect(out.scene?.map?.bars).toEqual(['1:1:e']);
        expect(out.scene?.map).not.toHaveProperty('walls');
    });

    it('ребро поза картою — відмова', () => {
        expect(() =>
            mapWallsMutation(ctx(), {
                kind: 'walls',
                add: ['9:0:e'],
                remove: [],
            })
        ).toThrow(REJECT.mapEdgeOutside);
    });

    it('бій без карти — відмова', () => {
        expect(() =>
            mapWallsMutation(ctx(null), {
                kind: 'walls',
                add: ['1:1:s'],
                remove: [],
            })
        ).toThrow(API_ERRORS.BATTLE_NO_MAP);
    });

    it('карта лабіринту — відмова', () => {
        const run = () =>
            mapWallsMutation(ctx(mazeMap()), {
                kind: 'walls',
                add: ['1:1:s'],
                remove: [],
            });

        expect(run).toThrow(BattleRuleError);
        expect(run).toThrow(REJECT.mapEdgesInMode);
    });
});

describe('map-walls route', () => {
    beforeEach(() => runBattleMutation.mockReset());

    it('лише ДМ, активний бій, власний ліміт частоти, блок режимом', async () => {
        const { POST } = await import(
            '@/app/api/campaigns/[id]/battles/[battleId]/map-walls/route'
        );

        await POST(new Request('http://x', { method: 'POST', body: '{}' }), {
            params: Promise.resolve({ id: 'c1', battleId: 'b1' }),
        });

        const { getBattleOperation } = await import(
            '@/lib/server/battles/operations'
        );

        expect(
            await getBattleOperation('map-walls', { id: 'c1', battleId: 'b1' })
        ).toMatchObject({
            access: BattleAccess.DM,
            requireStatus: BattleStatus.ACTIVE,
            rateLimitScope: 'mapWalls',
            blockedByMode: true,
            schema: mapWallsSchema,
            mutate: mapWallsMutation,
        });
        expect(runBattleMutation).toHaveBeenCalledWith(
            expect.any(Request),
            expect.objectContaining({ operation: 'map-walls' })
        );
    });
});
