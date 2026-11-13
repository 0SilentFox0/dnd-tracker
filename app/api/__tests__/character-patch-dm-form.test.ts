import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/db';
import * as apiAuth from '@/lib/utils/api/api-auth';
import { DEFAULT_RULES } from '@/lib/utils/rules';

vi.mock('@/lib/server/notifications/notify', () => ({
    notifyCharacterOwners: vi.fn().mockResolvedValue(0),
}));
vi.mock('@/lib/utils/api/api-auth', () => ({
    requireAuth: vi.fn(),
    requireCampaignAccess: vi.fn(),
    requireDM: vi.fn(),
}));
vi.mock('@/lib/server/characters/core/resolve-character-owner', () => ({
    resolveCharacterOwner: vi.fn(
        async (_c: string, _u: string, o: object) => o
    ),
}));
vi.mock('@/lib/db', () => ({
    prisma: {
        character: { findUnique: vi.fn(), update: vi.fn() },
        campaign: { findUnique: vi.fn() },
        race: { findFirst: vi.fn() },
    },
}));
vi.mock('@/lib/server/content/write', () => ({
    withCampaignContentWrite: async (
        _id: string,
        fn: (tx: unknown) => unknown
    ) => fn({ $queryRaw: async () => [], $executeRaw: async () => 1 }),
    withCampaignRuntimeWrite: async (
        _id: string,
        fn: (tx: unknown) => unknown
    ) => fn({ $queryRaw: async () => [], $executeRaw: async () => 1 }),
}));

const CHARACTER = {
    id: 'ch',
    campaignId: 'camp',
    controlledBy: 'owner',
    type: 'player',
    race: 'Ельф',
    level: 3,
    seenLevel: 3,
    strength: 10,
    spellSlots: {},
    immunities: [],
    characteristics: {},
};

const patch = async (body: unknown) => {
    const mod = await import(
        '@/app/api/campaigns/[id]/characters/[characterId]/route'
    );

    return mod.PATCH(
        new Request('http://x', {
            method: 'PATCH',
            body: JSON.stringify(body),
        }),
        { params: Promise.resolve({ id: 'camp', characterId: 'ch' }) }
    ) as Promise<NextResponse>;
};

describe('PATCH of the whole DM edit form', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({
            userId: 'dm',
            isDM: true,
            campaign: {
                id: 'camp',
                rules: DEFAULT_RULES,
                maxLevel: 20,
                allowPlayerEdit: true,
                members: [{ userId: 'dm', role: 'dm' }],
            },
        } as never);
        vi.mocked(prisma.character.findUnique).mockResolvedValue(
            CHARACTER as never
        );
        vi.mocked(prisma.race.findFirst).mockResolvedValue(null as never);
        vi.mocked(prisma.character.update).mockImplementation(((args: {
            data: object;
        }) => Promise.resolve(args.data)) as never);
    });

    it('controlledBy with a level change is 200 and writes only columns Prisma knows', async () => {
        const res = await patch({
            name: 'Hero',
            controlledBy: 'player-2',
            level: 5,
            systemBaseline: { career: 'x' },
        });

        const data = vi.mocked(prisma.character.update).mock.calls[0][0]
            .data as Record<string, unknown>;

        expect(res.status).toBe(200);
        expect(data).toMatchObject({ controlledBy: 'player-2', level: 5 });
        expect(data).not.toHaveProperty('systemBaseline');
    });
});
