import { beforeAll, describe, expect, it, vi } from 'vitest';

import { getResponseJson } from '@/app/api/__tests__/helpers';
import { BattleStatus } from '@/lib/constants/battle';
import { parseRules } from '@/lib/utils/rules/schema';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: {} }));

type Route =
    typeof import('@/app/api/campaigns/[id]/battles/[battleId]/system/[action]/route');

type Operations = typeof import('@/lib/server/battles/operations');

let route: Route;

let getBattleOperation: Operations['getBattleOperation'];

beforeAll(async () => {
    await import('@/lib/server/systems/registry');
    route = await import(
        '@/app/api/campaigns/[id]/battles/[battleId]/system/[action]/route'
    );
    getBattleOperation = (await import('@/lib/server/battles/operations'))
        .getBattleOperation;
}, 30_000);

const post = (action: string) =>
    route.POST(new Request('http://x', { method: 'POST', body: '{}' }), {
        params: Promise.resolve({ id: 'c', battleId: 'b', action }),
    });

const params = { id: 'c', battleId: 'b' };

describe('battles/[battleId]/system/[action]', () => {
    it.each(['nope', 'attack', 'next-turn', 'constructor'])(
        '%s is not a module battle operation: 404',
        async (action) => {
            const response = await post(action);

            expect(response.status).toBe(404);
            expect(
                (await getResponseJson<{ error: string }>(response)).error
            ).toBe('errors.battleUnknownOperation');
        }
    );
});

describe('module battle operations own their route settings', () => {
    it('crit-choice resolves with the d20 settings and no leaked `missing`', async () => {
        const def = await getBattleOperation('crit-choice', params);

        expect(def).toMatchObject({
            access: 'dm',
            allowWhileAwaitingDm: true,
            allowWhileCritPending: true,
            respond: 'wrapped',
            requireStatus: BattleStatus.ACTIVE,
        });
        expect(def).not.toHaveProperty('missing');
    });

    it('channel and morale-check keep their settings', async () => {
        expect(await getBattleOperation('channel', params)).toMatchObject({
            access: 'member',
            blockedByMode: true,
            rateLimitScope: 'attack',
        });
        expect(await getBattleOperation('morale-check', params)).toMatchObject({
            access: 'member',
            blockedByMode: true,
            allowWhileAwaitingDm: true,
            respond: 'wrapped',
        });
    });

    it('morale-check in a battle without the module answers BATTLE_MORALE_DISABLED as before', async () => {
        const def = await getBattleOperation('morale-check', params);

        const rules = parseRules({ system: { key: 'dnd5e' } });

        await expect(
            def.mutate({ meta: { rules } } as never, {} as never)
        ).rejects.toThrow('errors.battleMoraleDisabled');
    });

    it('a core operation keeps resolving from the core table', async () => {
        expect(await getBattleOperation('attack', params)).toMatchObject({
            access: 'member',
            rateLimitScope: 'attack',
        });
    });
});
