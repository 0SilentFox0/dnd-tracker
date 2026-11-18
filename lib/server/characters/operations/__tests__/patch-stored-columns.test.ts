import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { patchCharacter } from '@/app/api/campaigns/[id]/characters/[characterId]/patch-character';
import { prisma } from '@/lib/db';
import * as apiAuth from '@/lib/utils/api/api-auth';
import { parseRules } from '@/lib/utils/rules/schema';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';

vi.mock('@/lib/utils/api/api-auth', () => ({
    requireAuth: vi.fn(),
    requireCampaignAccess: vi.fn(),
    requireDM: vi.fn(),
}));
vi.mock('@/lib/server/characters/core/resolve-character-owner', () => ({
    resolveCharacterOwner: vi.fn(async () => ({ controlledBy: 'owner' })),
}));
vi.mock('@/lib/server/characters/lock', () => ({
    lockCharacters: vi.fn(
        async (_tx: unknown, ids: string[]) =>
            new Map(
                ids.map((id) => [
                    id,
                    { id, resources: {}, experience: 0, characteristics: null },
                ])
            )
    ),
}));
vi.mock('@/lib/supabase/avatar-storage', () => ({
    resolveAvatarForPersistence: vi.fn(async (a: string | undefined) => ({
        ok: true,
        avatar: a,
    })),
}));
vi.mock('@/lib/db', () => ({
    prisma: {
        character: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
        characterInventory: { create: vi.fn() },
        race: { findFirst: vi.fn() },
        $transaction: vi.fn(),
    },
}));

const access = (rules: unknown) =>
    ({
        userId: 'dm',
        isDM: true,
        campaign: {
            id: 'camp',
            maxLevel: 20,
            allowPlayerEdit: true,
            rules: parseRules({
                system: { key: 'wfrp' },
                ...(rules as object),
            }),
        },
    }) as never;

const patch = (body: object) =>
    patchCharacter(
        new Request('http://x', {
            method: 'PATCH',
            body: JSON.stringify(body),
        }),
        'camp',
        'ch'
    ) as Promise<NextResponse>;

describe('character patch keeps stored ext columns', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(prisma.$transaction).mockImplementation(((
            fn: (tx: unknown) => unknown
        ) => fn(prisma)) as never);
        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access({}));
        vi.mocked(prisma.character.findUnique).mockResolvedValue({
            id: 'ch',
            campaignId: 'camp',
            controlledBy: 'owner',
            level: 1,
            race: 'Human',
            type: 'player',
            avatar: null,
            characteristics: {
                ...DEFAULT_CHARACTERISTICS,
                ext: { morale: { value: 3 }, inspiration: { available: true } },
            },
        } as never);
        vi.mocked(prisma.character.update).mockImplementation((async (args: {
            data: object;
        }) => ({ id: 'ch', ...args.data })) as never);
    });

    it('a characteristics update without ext keeps the stored morale and inspiration', async () => {
        expect((await patch({
                characteristics: { ...DEFAULT_CHARACTERISTICS, fate: 2 },
            })).status).toBe(
            200
        );

        const { data } = vi.mocked(prisma.character.update).mock.calls[0][0];

        expect(data.characteristics).toMatchObject({
            fate: 2,
            ext: { morale: { value: 3 }, inspiration: { available: true } },
        });
    });
});

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
