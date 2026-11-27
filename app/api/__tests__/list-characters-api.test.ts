import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/db';
import * as apiAuth from '@/lib/utils/api/api-auth';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';

vi.mock('@/lib/utils/api/api-auth', () => ({ requireCampaignAccess: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: { character: { findMany: vi.fn() } } }));
vi.mock('@/lib/server/characters/operations/list-baked-stats', () => ({
    bakedStatsById: vi.fn(async () => new Map([['h1', { maxHp: 15, armorClass: 14 }]])),
}));

const list = async (qs = '') => {
    const { listCharacters } = await import(
        '@/app/api/campaigns/[id]/characters/list-characters'
    );

    return listCharacters(
        new Request(`http://x/api${qs}`),
        'camp'
    ) as Promise<NextResponse>;
};

describe('listCharacters status filter', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(prisma.character.findMany).mockResolvedValue([] as never);
    });

    it('за замовчуванням лише активні', async () => {
        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({
            userId: 'u',
            isDM: false,
            campaign: { rules: DEFAULT_RULES },
        } as never);

        await list();

        expect(
            vi.mocked(prisma.character.findMany).mock.calls[0][0]?.where
        ).toMatchObject({ status: 'active' });
    });

    it('чернетки для гравця — 403', async () => {
        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({
            userId: 'u',
            isDM: false,
            campaign: { rules: DEFAULT_RULES },
        } as never);

        expect((await list('?status=pending')).status).toBe(403);
        expect(prisma.character.findMany).not.toHaveBeenCalled();
    });

    it('чернетки для DM', async () => {
        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({
            userId: 'u',
            isDM: true,
            campaign: { rules: DEFAULT_RULES },
        } as never);

        await list('?status=pending');

        const arg = vi.mocked(prisma.character.findMany).mock.calls[0][0];

        expect(arg?.where).toMatchObject({ status: 'pending' });
        expect(arg?.select).toMatchObject({ reviewNote: true });
    });
});

describe('listCharacters baked maxHp', () => {
    const access = (isDM: boolean) =>
        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({
            userId: 'u',
            isDM,
            campaign: { rules: DEFAULT_RULES, maxLevel: 20 },
        } as never);

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(prisma.character.findMany).mockResolvedValue([
            { id: 'h1', name: 'A' },
            { id: 'h2', name: 'B' },
        ] as never);
    });

    it('DM with maxHp=1 gets the baked value where it was built', async () => {
        access(true);

        const body = await (await list('?maxHp=1')).json();

        expect(body[0].maxHp).toBe(15);
        expect(body[0].armorClass).toBe(14);
        expect(body[1].maxHp).toBeUndefined();
    });

    it('no flag or non-DM: no maxHp', async () => {
        access(true);

        expect((await (await list()).json())[0].maxHp).toBeUndefined();

        access(false);

        expect((await (await list('?maxHp=1')).json())[0].maxHp).toBeUndefined();
    });
});
