import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/db';
import { resolveAvatarForPersistence } from '@/lib/supabase/avatar-storage';
import * as apiAuth from '@/lib/utils/api/api-auth';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/utils/api/api-auth', () => ({ requireCampaignAccess: vi.fn() }));
vi.mock('@/lib/supabase/avatar-storage', () => ({
    resolveAvatarForPersistence: vi.fn(async (a: string | undefined) => ({
        ok: true,
        avatar: a,
    })),
}));
vi.mock('@/lib/server/characters/draft-lock', () => ({
    lockPlayerDrafts: vi.fn(),
}));
vi.mock('@/lib/db', () => {
    const prisma = {
        character: {
            count: vi.fn(),
            create: vi.fn(async ({ data }: { data: object }) => ({
                id: 'h1',
                ...data,
            })),
        },
        characterInventory: { create: vi.fn() },
        race: { findFirst: vi.fn() },
        career: { findMany: vi.fn() },
        feat: { findMany: vi.fn() },
        $transaction: vi.fn(),
    };

    prisma.$transaction.mockImplementation(
        async (fn: (tx: unknown) => unknown) => fn(prisma)
    );

    return { prisma };
});

import { createDraft } from '../create-draft';

const profile = {
    mods: { ws: 5 },
    move: 4,
    fate: 2,
    extraWounds: 0,
    talents: ['f1'],
    randomTalentCount: 1,
    randomTalents: [{ max: 100, featId: 'f2' }],
    careerTable: [{ max: 100, careerId: 'c1' }],
};

const rolls = [10, 11, 12, 13, 14, 15, 16, 17, 18, 8];

const body = (over: object = {}) => ({
    name: 'Hans',
    speciesId: 'r1',
    career: { mode: 'rolled', careerId: 'c1' },
    stats: { mode: 'rolled', rolls },
    talents: ['f2'],
    ...over,
});

const post = (data: object) =>
    createDraft(
        new Request('http://x', { method: 'POST', body: JSON.stringify(data) }),
        'camp'
    );

const asUser = (role: string) =>
    vi
        .mocked(apiAuth.requireCampaignAccess)
        .mockResolvedValue({
            userId: 'u1',
            campaign: {
                id: 'camp',
                maxLevel: 20,
                rules: WFRP_RULES,
                members: [{ userId: 'u1', role }],
            },
        } as never);

beforeEach(() => {
    vi.clearAllMocks();
    asUser('player');
    vi.mocked(prisma.character.count).mockResolvedValue(0);
    vi.mocked(prisma.race.findFirst).mockResolvedValue({
        campaignId: 'camp',
        name: 'Human',
        profile,
    } as never);
    vi.mocked(prisma.career.findMany).mockResolvedValue([
        { id: 'c1' },
        { id: 'c2' },
    ] as never);
    vi.mocked(prisma.feat.findMany).mockResolvedValue([
        { id: 'f1' },
        { id: 'f2' },
    ] as never);
});

describe('createWfrpDraft', () => {
    it('creates a pending hero with planned characteristics and experience', async () => {
        const res = await post(body());

        expect(res.status).toBe(200);

        const { data } = vi.mocked(prisma.character.create).mock
            .calls[0][0] as { data: Record<string, unknown> };

        expect(data).toMatchObject({
            name: 'Hans',
            race: 'Human',
            status: 'pending',
            type: 'player',
            controlledBy: 'u1',
            level: 1,
            class: '',
            archetype: null,
            campaignId: 'camp',
            skillTreeProgress: {},
        });
        expect(data.experience).toBe(
            WFRP_RULES.advancement.creation.careerBonus.rolled +
                WFRP_RULES.advancement.creation.statBonus.rolled
        );
        expect(data.characteristics).toMatchObject({
            base: { ws: 20 + 5 + 10 },
            move: 4,
            fate: 2,
            talents: { f1: 1, f2: 1 },
        });
        expect(prisma.characterInventory.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ characterId: 'h1' }),
        });
    });

    it('free career and free stats use their bonuses and a free career may be outside the table', async () => {
        const res = await post(
            body({
                career: { mode: 'free', careerId: 'c2' },
                stats: { mode: 'free', points: Array(10).fill(10) },
            })
        );

        expect(res.status).toBe(200);

        const { data } = vi.mocked(prisma.character.create).mock
            .calls[0][0] as { data: { experience: number } };

        expect(data.experience).toBe(
            WFRP_RULES.advancement.creation.careerBonus.free +
                WFRP_RULES.advancement.creation.statBonus.free
        );
    });

    it('species without a profile -> 422, no row', async () => {
        vi.mocked(prisma.race.findFirst).mockResolvedValue({
            campaignId: 'camp',
            name: 'Human',
            profile: null,
        } as never);

        expect((await post(body())).status).toBe(422);
        expect(prisma.character.create).not.toHaveBeenCalled();
    });

    it('species with an empty career table -> 422', async () => {
        vi.mocked(prisma.race.findFirst).mockResolvedValue({
            campaignId: 'camp',
            name: 'Human',
            profile: { ...profile, careerTable: [] },
        } as never);

        expect((await post(body())).status).toBe(422);
    });

    it('career outside the table -> 400 with issue codes', async () => {
        const res = await post(
            body({ career: { mode: 'rolled', careerId: 'c2' } })
        );

        expect(res.status).toBe(400);
        expect((await res.json()).issues).toContain('CAREER_NOT_IN_TABLE');
        expect(prisma.character.create).not.toHaveBeenCalled();
    });

    it('rolled career unknown to the campaign -> 400, avatar not uploaded', async () => {
        vi.mocked(prisma.career.findMany).mockResolvedValue([
            { id: 'c2' },
        ] as never);

        const res = await post(body({ avatar: 'data:image/png;base64,AAAA' }));

        expect(res.status).toBe(400);
        expect((await res.json()).issues).toContain('CAREER_UNKNOWN');
        expect(resolveAvatarForPersistence).not.toHaveBeenCalled();
    });

    it('rearranged stats that are not a permutation -> 400', async () => {
        const res = await post(
            body({
                stats: {
                    mode: 'rearranged',
                    rolls,
                    arranged: rolls.map((r) => r + 1),
                },
            })
        );

        expect(res.status).toBe(400);
        expect((await res.json()).issues).toContain('STATS_NOT_PERMUTATION');
    });

    it('malformed body -> 400', async () => {
        expect((await post({ name: 'x' })).status).toBe(400);
    });

    it('missing species (or one of another campaign) -> 404', async () => {
        vi.mocked(prisma.race.findFirst).mockResolvedValueOnce(null);
        expect((await post(body())).status).toBe(404);
    });

    it('DM is rejected, an existing draft is rejected', async () => {
        asUser('dm');
        expect((await post(body())).status).toBe(400);

        asUser('player');
        vi.mocked(prisma.character.count).mockResolvedValue(1);
        expect((await post(body())).status).toBe(400);
        expect(prisma.character.create).not.toHaveBeenCalled();
    });

    it('a draft that appears between the check and the lock is rejected', async () => {
        vi.mocked(prisma.character.count)
            .mockResolvedValueOnce(0)
            .mockResolvedValueOnce(1);

        expect((await post(body())).status).toBe(400);
        expect(prisma.character.create).not.toHaveBeenCalled();
    });
});
