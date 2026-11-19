import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/db';
import * as apiAuth from '@/lib/utils/api/api-auth';
import { parseRules } from '@/lib/utils/rules/schema';

vi.mock('@/lib/utils/api/api-auth', () => ({
    requireAuth: vi.fn(),
    requireCampaignAccess: vi.fn(),
    requireDM: vi.fn(),
}));
vi.mock('@/lib/server/characters/core/resolve-character-owner', () => ({
    resolveCharacterOwner: vi.fn(async () => ({ controlledBy: 'owner' })),
}));
vi.mock('@/lib/db', () => ({
    prisma: {
        character: { create: vi.fn() },
        characterInventory: { create: vi.fn() },
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

const create = async (system: object) => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue({
        userId: 'dm',
        isDM: true,
        campaign: { id: 'camp', rules: parseRules({ system }) },
    } as never);

    const { createCharacter } = await import(
        '@/app/api/campaigns/[id]/characters/create-character'
    );

    const body = {
        name: 'Ліра',
        type: 'player',
        controlledBy: 'owner',
        class: 'Wizard',
        race: 'Маги',
        level: 1,
        morale: 2,
    };

    await (createCharacter(
        new Request('http://x', { method: 'POST', body: JSON.stringify(body) }),
        'camp'
    ) as Promise<NextResponse>);

    return vi.mocked(prisma.character.create).mock.calls[0][0].data
        .characteristics as { ext?: { morale?: { value?: number } } } | null;
};

describe('створення персонажа: мораль', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(prisma.race.findFirst).mockResolvedValue(null);
        vi.mocked(prisma.character.create).mockImplementation((async (args: {
            data: object;
        }) => ({ id: 'c', ...args.data })) as never);
    });

    it('з модулем morale пишеться в ext.morale.value', async () => {
        const c = await create({ key: 'd20', modules: ['morale'] });

        expect(c?.ext?.morale?.value).toBe(2);
    });

    it('без модуля morale ігнорується', async () => {
        const c = await create({ key: 'd20' });

        expect(c?.ext?.morale).toBeUndefined();
    });
});
