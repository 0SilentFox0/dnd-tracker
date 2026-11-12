import { beforeEach, describe, expect, it, vi } from 'vitest';

import { context, goblin, hero } from './fixtures';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { BattleStatus } from '@/lib/constants/battle';
import { mapMotionSchema } from '@/lib/schemas/battles';
import { mapMotionMutation } from '@/lib/server/battles/mutations/map-motion/map-motion-mutation';
import { BattleAccess } from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { BattleRuleError } from '@/lib/utils/battle/store';
import type { BattleMapConfig } from '@/types/battle';

const runBattleMutation = vi.hoisted(() => vi.fn());

vi.mock('@/lib/server/battles/run-mutation', () => ({ runBattleMutation }));

const map: BattleMapConfig = {
    cols: 10,
    rows: 5,
    background: null,
    opacity: 0.3,
    weather: 'fog',
    terrain: { '1:1': { kind: 'wall' } },
};

const ctx = (m: BattleMapConfig | null = map) => {
    const base = context({ participants: [hero, goblin], isDM: true });

    return { ...base, meta: { ...base.meta, map: m } };
};

describe('map-motion mutation', () => {
    it('sets motion and keeps the rest of the map', () => {
        const c = ctx();

        const out = mapMotionMutation(c, { motion: { axis: 'x', speed: 2 } });

        expect(out.scene?.map).toEqual({
            ...map,
            motion: { axis: 'x', speed: 2 },
        });
        expect(out.events).toEqual([]);
        expect(out.participants).toBe(c.participants);
        expect(out.pending).toBe(c.pending);
    });

    it('null removes the key', () => {
        const out = mapMotionMutation(
            ctx({ ...map, motion: { axis: 'y', speed: 1 } }),
            { motion: null }
        );

        expect(out.scene?.map).toEqual(map);
        expect(out.scene?.map).not.toHaveProperty('motion');
    });

    it('keeps speed 0 as stopped, not off', () => {
        const out = mapMotionMutation(ctx(), {
            motion: { axis: 'y', speed: 0 },
        });

        expect(out.scene?.map).toMatchObject({
            motion: { axis: 'y', speed: 0 },
        });
    });

    it('rejects a battle without a map', () => {
        expect(() => mapMotionMutation(ctx(null), { motion: null })).toThrow(
            BattleRuleError
        );
        expect(() => mapMotionMutation(ctx(null), { motion: null })).toThrow(
            API_ERRORS.BATTLE_NO_MAP
        );
    });
});

describe('map-motion route', () => {
    beforeEach(() => runBattleMutation.mockReset());

    it('DM only, active battle only, own rate limit scope', async () => {
        const { POST } = await import(
            '@/app/api/campaigns/[id]/battles/[battleId]/map-motion/route'
        );

        await POST(new Request('http://x', { method: 'POST', body: '{}' }), {
            params: Promise.resolve({ id: 'c1', battleId: 'b1' }),
        });

        const { getBattleOperation } = await import(
            '@/lib/server/battles/operations'
        );

        expect(
            await getBattleOperation('map-motion', { id: 'c1', battleId: 'b1' })
        ).toMatchObject({
            access: BattleAccess.DM,
            requireStatus: BattleStatus.ACTIVE,
            rateLimitScope: 'mapMotion',
            schema: mapMotionSchema,
            mutate: mapMotionMutation,
        });
        expect(runBattleMutation).toHaveBeenCalledWith(
            expect.any(Request),
            expect.objectContaining({
                operation: 'map-motion',
                params: { id: 'c1', battleId: 'b1' },
            })
        );
    });
});
