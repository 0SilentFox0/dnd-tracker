import { NextResponse } from 'next/server';
import {
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { z } from 'zod';

import { getResponseJson } from '@/app/api/__tests__/helpers';
import { prisma } from '@/lib/db';
import * as characterAccess from '@/lib/server/characters/access';
import type { SystemServer } from '@/lib/server/systems/types';
import * as apiAuth from '@/lib/utils/api/api-auth';
import { parseRules } from '@/lib/utils/rules/schema';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
    prisma: { character: { findUnique: vi.fn() } },
}));
vi.mock('@/lib/server/characters/access', async (importOriginal) => ({
    ...(await importOriginal<
        typeof import('@/lib/server/characters/access')
    >()),
    requireCharacterRow: vi.fn(),
}));
vi.mock('@/lib/utils/api/api-auth', () => ({
    requireCampaignAccess: vi.fn(),
    requireDM: vi.fn(),
}));

const fixture = vi.hoisted(() => ({ server: undefined as unknown }));

vi.mock('@/lib/server/systems/registry', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@/lib/server/systems/registry')>();

    return {
        ...actual,
        systemServerOf: (rules: Parameters<typeof actual.systemServerOf>[0]) =>
            (fixture.server as SystemServer | undefined) ??
            actual.systemServerOf(rules),
    };
});

type Routes = typeof import('@/lib/server/systems/routes');

type Operations = typeof import('@/lib/server/characters/operations/registry');

let routes: Routes;

let operations: Operations;

beforeAll(async () => {
    await import('@/lib/server/systems/registry');
    routes = await import('@/lib/server/systems/routes');
    operations = await import('@/lib/server/characters/operations/registry');
}, 30_000);

const access = (system: object, role: 'dm' | 'player' = 'dm') =>
    ({
        userId: 'u',
        isDM: role === 'dm',
        campaign: {
            id: 'camp',
            kind: 'standard',
            maxLevel: 20,
            allowPlayerEdit: false,
            rules: parseRules({ system }),
            members: [{ userId: 'u', role }],
        },
    }) as never;

const call = (
    scope: 'campaign' | 'character',
    action: string,
    method = 'POST',
    body?: unknown
) =>
    routes.runSystemRoute(
        scope,
        new Request('http://x/api', {
            method,
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        }),
        {
            id: 'camp',
            characterId: scope === 'character' ? 'ch' : undefined,
            action,
        }
    );

const REACHED = 418;

const reachOperation = (key: string) =>
    vi
        .spyOn(operations.CHARACTER_OPERATIONS[key], 'gate')
        .mockResolvedValue(
            NextResponse.json({ reached: key }, { status: REACHED })
        );

const errorOf = async (response: Response) =>
    (await getResponseJson<{ error: string }>(response as NextResponse)).error;

beforeEach(() => {
    vi.clearAllMocks();
    fixture.server = undefined;
});

afterEach(() => vi.restoreAllMocks());

describe('runSystemRoute', () => {
    it('answers an unknown action with 404 systemActionUnknown', async () => {
        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
            access({ key: 'homm' })
        );

        const response = await call('character', 'nope');

        expect(response.status).toBe(404);
        expect(await errorOf(response)).toBe('errors.systemActionUnknown');
    });

    it('serves progression in homm and hides it in bare dnd5e', async () => {
        reachOperation('progression');

        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
            access({ key: 'homm' })
        );

        expect((await call('character', 'progression', 'GET')).status).toBe(
            REACHED
        );

        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
            access({ key: 'dnd5e' })
        );

        const hidden = await call('character', 'progression', 'GET');

        expect(hidden.status).toBe(404);
        expect(await errorOf(hidden)).toBe('errors.systemActionUnknown');
    });

    it('reaches advance in wfrp and answers 404 in dnd5e', async () => {
        reachOperation('advance');

        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
            access({ key: 'wfrp' })
        );

        expect((await call('character', 'advance')).status).toBe(REACHED);

        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
            access({ key: 'dnd5e' })
        );

        expect((await call('character', 'advance')).status).toBe(404);
    });

    it('maps the method of one route onto different operations', async () => {
        const post = reachOperation('advance');

        const del = reachOperation('advance.undo');

        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
            access({ key: 'wfrp' })
        );

        await call('character', 'advance', 'DELETE');

        expect(del).toHaveBeenCalledTimes(1);
        expect(post).not.toHaveBeenCalled();
    });

    it('answers 403 to a non-member before it can tell 404 from 200', async () => {
        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
            NextResponse.json({ error: 'errors.forbidden' }, { status: 403 })
        );

        expect((await call('character', 'nope')).status).toBe(403);
        expect((await call('character', 'advance')).status).toBe(403);
    });

    it('does not hand member access to the operation gate (a player on downtime.period gets 403)', async () => {
        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
            access({ key: 'wfrp' }, 'player')
        );

        vi.mocked(apiAuth.requireDM).mockResolvedValue(
            NextResponse.json({ error: 'errors.dmOnly' }, { status: 403 })
        );

        const response = await call('campaign', 'downtime.period');

        expect(response.status).toBe(403);
        expect(apiAuth.requireDM).toHaveBeenCalledWith('camp');
    });

    it('answers 405 for a method the route does not declare', async () => {
        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
            access({ key: 'wfrp' })
        );

        const response = await call('character', 'career', 'GET');

        expect(response.status).toBe(405);
        expect(await errorOf(response)).toBe('errors.methodNotAllowed');
    });

    describe('SystemHandler targets', () => {
        const handle = vi.fn(async () => NextResponse.json({ ok: true }));

        beforeEach(() => {
            handle.mockClear();

            fixture.server = {
                schemas: {},
                balance: {} as never,
                routes: {
                    campaign: {
                        'dm-only': { POST: { access: 'dm', handle } },
                        member: {
                            POST: {
                                access: 'member',
                                schema: z.object({ n: z.number() }),
                                handle,
                            },
                        },
                    },
                },
            } satisfies SystemServer;
        });

        it('refuses a non-DM on an access: dm handler', async () => {
            vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
                access({ key: 'homm' }, 'player')
            );

            const response = await call('campaign', 'dm-only');

            expect(response.status).toBe(403);
            expect(await errorOf(response)).toBe('errors.dmOnly');
            expect(handle).not.toHaveBeenCalled();
        });

        const characterHandler = (dmOnly = false) => {
            fixture.server = {
                schemas: {},
                balance: {} as never,
                routes: {
                    character: {
                        who: {
                            GET: {
                                access: dmOnly ? 'dm' : 'member',
                                handle,
                            },
                        },
                    },
                },
            } satisfies SystemServer;
        };

        it('answers 404 and skips the handler for a character of another campaign', async () => {
            characterHandler();

            vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
                access({ key: 'homm' }, 'player')
            );

            const real = await vi.importActual<
                typeof import('@/lib/server/characters/access')
            >('@/lib/server/characters/access');

            vi.mocked(characterAccess.requireCharacterRow).mockImplementation(
                real.requireCharacterRow
            );
            vi.mocked(prisma.character.findUnique).mockResolvedValue({
                id: 'who',
                campaignId: 'other-campaign',
                controlledBy: null,
            } as never);

            const response = await call('character', 'who', 'GET');

            expect(response.status).toBe(404);
            expect(await errorOf(response)).toBe('errors.characterNotFound');
            expect(handle).not.toHaveBeenCalled();
        });

        it('answers 403 for a foreign character of the own campaign', async () => {
            characterHandler();

            vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
                access({ key: 'homm' }, 'player')
            );
            vi.mocked(characterAccess.requireCharacterRow).mockResolvedValue(
                NextResponse.json(
                    { error: 'errors.forbidden' },
                    { status: 403 }
                )
            );

            expect((await call('character', 'who', 'GET')).status).toBe(403);
            expect(handle).not.toHaveBeenCalled();
        });

        it('hands the gated character row to the handler', async () => {
            characterHandler();

            const row = { id: 'ch', campaignId: 'camp', controlledBy: 'u' };

            const granted = access({ key: 'homm' }, 'player');

            vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(granted);
            vi.mocked(characterAccess.requireCharacterRow).mockResolvedValue({
                access: granted,
                character: row,
            } as never);

            await call('character', 'who', 'GET');

            expect(characterAccess.requireCharacterRow).toHaveBeenCalledWith(
                'camp',
                'ch',
                expect.objectContaining({ dmOnly: false })
            );
            expect(handle).toHaveBeenCalledWith(
                expect.objectContaining({ character: row })
            );
        });

        it('lets the DM reach any character of the campaign', async () => {
            characterHandler(true);

            const row = { id: 'ch', campaignId: 'camp', controlledBy: 'other' };

            const granted = access({ key: 'homm' }, 'dm');

            vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(granted);
            vi.mocked(characterAccess.requireCharacterRow).mockResolvedValue({
                access: granted,
                character: row,
            } as never);

            await call('character', 'who', 'GET');

            expect(handle).toHaveBeenCalledWith(
                expect.objectContaining({ character: row })
            );
        });

        it('passes the parsed body to a member handler and rejects a bad one with 400', async () => {
            vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
                access({ key: 'homm' }, 'player')
            );

            expect(
                (await call('campaign', 'member', 'POST', { n: 1 })).status
            ).toBe(200);
            expect(handle).toHaveBeenCalledWith(
                expect.objectContaining({ campaignId: 'camp', input: { n: 1 } })
            );
            expect(
                (await call('campaign', 'member', 'POST', { n: 'x' })).status
            ).toBe(400);
        });
    });
});
