import { NextResponse } from 'next/server';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { getResponseJson } from './helpers';

import { prisma } from '@/lib/db';
import * as apiAuth from '@/lib/utils/api/api-auth';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import { buildTreeJson } from '@/lib/utils/skills/progression';

vi.mock('@/lib/server/notifications/notify', () => ({
    notifyCharacterOwners: vi.fn().mockResolvedValue(0),
}));
vi.mock('@/lib/utils/api/api-auth', () => ({
    requireCampaignAccess: vi.fn(),
    requireAuth: vi.fn(),
    requireDM: vi.fn(),
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

vi.mock('@/lib/db', () => ({
    prisma: {
        character: {
            findFirst: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
            updateMany: vi.fn(),
        },
        skillTreeProgress: {
            findUnique: vi.fn(),
            createMany: vi.fn(),
            updateMany: vi.fn(),
        },
        campaign: { findUnique: vi.fn() },
        race: { findFirst: vi.fn() },
        skillTree: { findFirst: vi.fn() },
        skill: { findMany: vi.fn() },
        mainSkill: { findMany: vi.fn() },
        $transaction: vi.fn(),
    },
}));

const access = (userId: string, role: 'dm' | 'player') =>
    ({
        userId,
        isDM: role === 'dm',
        campaign: {
            id: 'camp',
            rules: DEFAULT_RULES,
            maxLevel: 20,
            members: [{ userId, role }],
        },
    }) as never;

const CHAR = {
    id: 'ch',
    level: 3,
    race: 'Ельф',
    skillTreeProgress: {
        'json-id': { unlockedSkills: ['attack_basic_level'] },
    },
    seenLevel: 2,
    controlledBy: 'owner',
};

const TREE_ROW = {
    id: 'row-id',
    campaignId: 'camp',
    race: 'Ельф',
    createdAt: new Date(),
    skills: buildTreeJson({
        id: 'json-id',
        race: 'Ельф',
        branches: [
            { id: 'attack', name: 'Напад', color: 'red', outer: ['o1'] },
        ],
    }),
};

const characterParams = {
    params: Promise.resolve({ id: 'camp', characterId: 'ch' }),
};

const params = (action: string) => ({
    params: Promise.resolve({
        id: 'camp',
        characterId: 'ch',
        action: `progression.${action}`,
    }),
});

const post = async (action: string, body?: unknown) => {
    const request = new Request('http://x', {
        method: 'POST',
        body: JSON.stringify(body ?? {}),
    });

    if (action === 'seen-level') {
        const seen = await import(
            '@/app/api/campaigns/[id]/characters/[characterId]/progression/seen-level/route'
        );

        return seen.POST(request, characterParams) as Promise<NextResponse>;
    }

    const mod = await import(
        '@/app/api/campaigns/[id]/characters/[characterId]/system/[action]/route'
    );

    return mod.POST(request, params(action)) as Promise<NextResponse>;
};

let table: { progress: unknown; version: number } | null = null;

let column: unknown = null;

describe('progression actions', () => {
    beforeAll(async () => {
        await import('@/app/api/campaigns/[id]/characters/[characterId]/route');
        await import(
            '@/app/api/campaigns/[id]/characters/[characterId]/system/[action]/route'
        );
    }, 30_000);

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(prisma.$transaction).mockImplementation(((
            fn: (tx: unknown) => unknown
        ) => fn(prisma)) as never);
        vi.mocked(prisma.character.findFirst).mockResolvedValue({
            ...CHAR,
            level: 3,
        } as never);
        vi.mocked(prisma.skillTree.findFirst).mockResolvedValue(
            TREE_ROW as never
        );
        vi.mocked(prisma.character.updateMany).mockResolvedValue({
            count: 1,
        } as never);
        table = null;
        column = CHAR.skillTreeProgress;
        vi.mocked(prisma.character.findUnique).mockImplementation(
            (async () => ({
                skillTreeProgress: column,
            })) as never
        );
        vi.mocked(prisma.character.update).mockImplementation((async ({
            data,
        }: {
            data: { skillTreeProgress?: unknown };
        }) => {
            if (data.skillTreeProgress !== undefined)
                column = data.skillTreeProgress;

            return {};
        }) as never);
        vi.mocked(prisma.skillTreeProgress.findUnique).mockImplementation(
            (async () => table) as never
        );
        vi.mocked(prisma.skillTreeProgress.createMany).mockImplementation((async ({
            data,
        }: {
            data: { progress: unknown; version: number }[];
        }) => {
            if (table) return { count: 0 };

            table = { progress: data[0].progress, version: data[0].version };

            return { count: 1 };
        }) as never);
        vi.mocked(prisma.skillTreeProgress.updateMany).mockImplementation(
            (async ({
                where,
                data,
            }: {
                where: { version: number };
                data: { progress: unknown };
            }) => {
                if (!table || table.version !== where.version)
                    return { count: 0 };

                table = { progress: data.progress, version: table.version + 1 };

                return { count: 1 };
            }) as never
        );
    });

    it('власник без allowPlayerEdit вчить; запис під id рядка в таблицю й колонку', async () => {
        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
            access('owner', 'player')
        );

        const res = await post('learn', { nodeId: 'o1' });

        expect(res.status).toBe(200);
        expect(await getResponseJson(res)).toEqual({
            unlocked: ['attack_basic_level', 'o1'],
        });

        const written = {
            'row-id': { unlockedSkills: ['attack_basic_level', 'o1'] },
        };

        expect(table).toEqual({ progress: written, version: 1 });
        expect(column).toEqual(written);
        expect(
            vi.mocked(prisma.character.updateMany).mock.calls[0][0].where
        ).toEqual({ id: 'ch', level: 3 });
    });

    it("JSON null у колонці ('null'::jsonb): вивчення працює", async () => {
        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
            access('owner', 'player')
        );
        column = null;

        const res = await post('learn', { nodeId: 'attack_basic_level' });

        expect(res.status).toBe(200);
        expect(await getResponseJson(res)).toEqual({
            unlocked: ['attack_basic_level'],
        });

        expect(column).toEqual({
            'row-id': { unlockedSkills: ['attack_basic_level'] },
        });
    });

    it('порушення правил → 422 з reason', async () => {
        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
            access('owner', 'player')
        );

        const res = await post('learn', { nodeId: 'attack_expert_level' });

        expect(res.status).toBe(422);
        expect(await getResponseJson(res)).toEqual({ reason: 'branchOrder' });
    });

    it('паралельна зміна прогресу → 409', async () => {
        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
            access('owner', 'player')
        );
        table = { progress: CHAR.skillTreeProgress, version: 2 };
        vi.mocked(prisma.skillTreeProgress.updateMany).mockResolvedValue({
            count: 0,
        } as never);

        expect((await post('learn', { nodeId: 'o1' })).status).toBe(409);
    });

    it('unlearn і reset — лише DM', async () => {
        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
            access('owner', 'player')
        );
        expect(
            (await post('unlearn', { nodeIds: ['attack_basic_level'] })).status
        ).toBe(403);
        expect((await post('reset')).status).toBe(403);

        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
            access('dm', 'dm')
        );
        expect(
            await getResponseJson(
                await post('unlearn', { nodeIds: ['attack_basic_level'] })
            )
        ).toEqual({ unlocked: [] });
        expect(await getResponseJson(await post('reset'))).toEqual({
            unlocked: [],
        });
    });

    it('DM прибирає кілька вузлів (сироти) одним запитом', async () => {
        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
            access('dm', 'dm')
        );
        column = {
            'json-id': {
                unlockedSkills: ['attack_basic_level', 'gone-1', 'gone-2'],
            },
        };

        const res = await post('unlearn', { nodeIds: ['gone-1', 'gone-2'] });

        expect(await getResponseJson(res)).toEqual({
            unlocked: ['attack_basic_level'],
        });
        expect(prisma.skillTreeProgress.createMany).toHaveBeenCalledTimes(1);
        expect(column).toEqual({
            'row-id': { unlockedSkills: ['attack_basic_level'] },
        });
    });

    it('unlearn: порожній список — 400', async () => {
        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
            access('dm', 'dm')
        );

        expect((await post('unlearn', { nodeIds: [] })).status).toBe(400);
    });

    it('не власник і не DM — learn 403, запису немає', async () => {
        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
            access('stranger', 'player')
        );

        expect((await post('learn', { nodeId: 'o1' })).status).toBe(403);
        expect(prisma.skillTreeProgress.createMany).not.toHaveBeenCalled();
    });

    it('PATCH персонажа з тим самим, потім вищим рівнем не ламає guard — learn після кожного → 200', async () => {
        const tree = {
            ...TREE_ROW,
            skills: buildTreeJson({
                id: 'json-id',
                race: 'Ельф',
                branches: [
                    {
                        id: 'attack',
                        name: 'Напад',
                        color: 'red',
                        outer: ['o1'],
                    },
                    { id: 'defense', name: 'Захист', color: 'blue' },
                ],
            }),
        };

        let row: Record<string, unknown> = {
            ...CHAR,
            campaignId: 'camp',
            type: 'player',
            spellSlots: {},
            immunities: [],
            strength: 10,
            dexterity: 10,
            constitution: 10,
            intelligence: 10,
            wisdom: 10,
            charisma: 10,
        };

        vi.mocked(prisma.skillTree.findFirst).mockResolvedValue(tree as never);
        vi.mocked(prisma.character.findUnique).mockImplementation(
            (async () => row) as never
        );
        vi.mocked(prisma.character.findFirst).mockImplementation(
            (async () => row) as never
        );
        vi.mocked(prisma.character.update).mockImplementation(
            (async ({ data }: { data: Record<string, unknown> }) =>
                (row = { ...row, ...data })) as never
        );
        vi.mocked(prisma.character.updateMany).mockImplementation((async ({
            where,
            data,
        }: {
            where: { level?: number };
            data: Record<string, unknown>;
        }) => {
            const ok = where.level === undefined || where.level === row.level;

            if (ok) row = { ...row, ...data };

            return { count: ok ? 1 : 0 };
        }) as never);
        vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
            allowPlayerEdit: false,
            maxLevel: 20,
        } as never);
        vi.mocked(prisma.race.findFirst).mockResolvedValue(null);

        const patchCharacter = async (body: unknown) => {
            vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
                access('dm', 'dm')
            );

            const { PATCH } = await import(
                '@/app/api/campaigns/[id]/characters/[characterId]/route'
            );

            return PATCH(
                new Request('http://x', {
                    method: 'PATCH',
                    body: JSON.stringify(body),
                }),
                characterParams
            );
        };

        const learnAsOwner = (nodeId: string) => {
            vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
                access('owner', 'player')
            );

            return post('learn', { nodeId });
        };

        expect((await patchCharacter({ level: 3 })).status).toBe(200);
        expect((await learnAsOwner('o1')).status).toBe(200);

        expect((await patchCharacter({ level: 4 })).status).toBe(200);
        expect((await learnAsOwner('defense_basic_level')).status).toBe(200);

        expect(row.skillTreeProgress).toEqual({
            'row-id': {
                unlockedSkills: [
                    'attack_basic_level',
                    'o1',
                    'defense_basic_level',
                ],
            },
        });
    });

    it('seen-level — лише власник, ставить поточний рівень', async () => {
        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
            access('dm', 'dm')
        );
        expect((await post('seen-level')).status).toBe(403);

        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
            access('owner', 'player')
        );

        const res = await post('seen-level');

        expect(await getResponseJson(res)).toEqual({ seenLevel: 3 });
        expect(vi.mocked(prisma.character.updateMany).mock.calls[0][0]).toEqual(
            { where: { id: 'ch' }, data: { seenLevel: 3 } }
        );
    });

    it('невалідне тіло → 400', async () => {
        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
            access('owner', 'player')
        );

        expect((await post('learn', { nodeId: '' })).status).toBe(400);
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
