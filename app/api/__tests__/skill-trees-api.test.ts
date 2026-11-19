import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { dispatchedRoute } from './dispatched-route';
import { getResponseJson } from './helpers';

import { prisma } from '@/lib/db';
import * as apiAuth from '@/lib/utils/api/api-auth';
import { buildTreeJson } from '@/lib/utils/skills/progression';

vi.mock('@/lib/utils/api/api-auth', () => ({
    requireDM: vi.fn(),
    requireCampaignAccess: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
    prisma: {
        skillTree: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        },
        character: {
            findMany: vi.fn(),
            updateMany: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        skillTreeProgress: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            createMany: vi.fn(),
            updateMany: vi.fn(),
        },
        mainSkill: { findMany: vi.fn() },
        skill: { findMany: vi.fn() },
        $queryRaw: vi.fn(async () => [{ id: 'camp' }]),
        campaign: { update: vi.fn(async () => ({ contentVersion: 1 })) },
        $transaction: vi.fn(),
    },
}));

const RAW = buildTreeJson({
    race: 'Ельф',
    branches: [{ id: 'attack', name: 'Напад', color: 'red', outer: ['o1'] }],
});

const patch = async (treeId: string, skills: unknown) => {
    const { PATCH } = dispatchedRoute('skill-trees/:treeId');

    return PATCH(
        new Request('http://x', {
            method: 'PATCH',
            body: JSON.stringify({ race: 'Ельф', skills }),
        }),
        { params: Promise.resolve({ id: 'camp', treeId }) }
    );
};

describe('PATCH skill tree', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(apiAuth.requireDM).mockResolvedValue({
            userId: 'dm',
        } as never);
        vi.mocked(prisma.mainSkill.findMany).mockResolvedValue([
            { id: 'attack' },
        ] as never);
        vi.mocked(prisma.skill.findMany).mockResolvedValue([
            { id: 'o1' },
        ] as never);
        vi.mocked(prisma.character.findMany).mockResolvedValue([] as never);
        vi.mocked(prisma.skillTreeProgress.findMany).mockResolvedValue(
            [] as never
        );
        vi.mocked(prisma.skillTreeProgress.findUnique).mockResolvedValue(null);
        vi.mocked(prisma.skillTreeProgress.createMany).mockResolvedValue({
            count: 1,
        } as never);
        vi.mocked(prisma.skillTreeProgress.updateMany).mockResolvedValue({
            count: 1,
        } as never);
        vi.mocked(prisma.character.update).mockResolvedValue({} as never);
        vi.mocked(prisma.$transaction).mockImplementation((async (
            fn: (tx: typeof prisma) => unknown
        ) => fn(prisma)) as never);
        vi.mocked(prisma.character.updateMany).mockResolvedValue({
            count: 1,
        } as never);
        vi.mocked(prisma.skillTree.create).mockImplementation((async ({
            data,
        }: {
            data: object;
        }) => ({ id: 'generated', ...data })) as never);
        vi.mocked(prisma.skillTree.update).mockImplementation((async ({
            where,
            data,
        }: {
            where: { id: string };
            data: object;
        }) => ({ id: where.id, race: 'Ельф', ...data })) as never);
    });

    it('новий: створює з власним id, skills.id = id рядка', async () => {
        vi.mocked(prisma.skillTree.findFirst).mockResolvedValue(null);

        const body = await getResponseJson<{
            id: string;
            skills: { id: string };
        }>((await patch('mock-Ельф-camp', RAW)) as never);

        const data = vi.mocked(prisma.skillTree.create).mock.calls[0][0]
            .data as Record<string, unknown>;

        expect(data.id).toBeUndefined();
        expect(
            vi.mocked(prisma.skillTree.update).mock.calls[0][0]
        ).toMatchObject({
            where: { id: 'generated' },
            data: { skills: { id: 'generated' } },
        });
        expect(body.id).toBe('generated');
    });

    it('існуючий у кампанії за id — оновлює, skills.id = id рядка', async () => {
        vi.mocked(prisma.skillTree.findFirst).mockResolvedValueOnce({
            id: 'row',
            campaignId: 'camp',
            race: 'Ельф',
        } as never);

        await patch('row', RAW);

        expect(
            vi.mocked(prisma.skillTree.update).mock.calls[0][0]
        ).toMatchObject({
            where: { id: 'row' },
            data: { skills: { id: 'row' } },
        });
    });

    it('дубль скіла → 400 з помилками', async () => {
        vi.mocked(prisma.skillTree.findFirst).mockResolvedValue(null);

        const raw = buildTreeJson({
            race: 'Ельф',
            branches: [
                {
                    id: 'attack',
                    name: 'Напад',
                    color: 'red',
                    levels: { basic: 'o1' },
                    outer: ['o1'],
                },
            ],
        });

        const res = await patch('new', raw);

        expect(res.status).toBe(400);
        expect(await getResponseJson(res as never)).toMatchObject({
            error: expect.stringContaining(
                'skillTree.treeErrors.duplicateSkill'
            ),
            issues: [{ code: 'duplicateSkill', ref: 'o1' }],
        });
    });

    it('прогрес під старим JSON id дерева переноситься під id рядка при збереженні', async () => {
        vi.mocked(prisma.skillTree.findFirst).mockResolvedValueOnce({
            id: 'row',
            campaignId: 'camp',
            race: 'Ельф',
            skills: { id: 'mock-Ельф-camp', mainSkills: [] },
        } as never);
        vi.mocked(prisma.character.findMany).mockResolvedValue([
            { id: 'a' },
            { id: 'b' },
        ] as never);
        vi.mocked(prisma.skillTreeProgress.findUnique).mockImplementation((async ({
            where,
        }: {
            where: { characterId: string };
        }) => ({
            progress:
                where.characterId === 'a'
                    ? {
                          'mock-Ельф-camp': { unlockedSkills: ['o1'] },
                          other: { unlockedSkills: ['x'] },
                      }
                    : { row: { unlockedSkills: ['o1'] } },
            version: 1,
        })) as never);

        await patch('row', RAW);

        expect(
            vi.mocked(prisma.character.findMany).mock.calls[0][0]
        ).toMatchObject({ where: { campaignId: 'camp', race: 'Ельф' } });
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        expect(vi.mocked(prisma.skillTreeProgress.updateMany).mock.calls).toEqual([
            [
                {
                    where: { characterId: 'a', version: 1 },
                    data: {
                        progress: {
                            row: { unlockedSkills: ['o1'] },
                            other: { unlockedSkills: ['x'] },
                        },
                        version: { increment: 1 },
                    },
                },
            ],
        ]);
        expect(prisma.character.update).not.toHaveBeenCalled();
    });

    const OLD = {
        id: 'row',
        campaignId: 'camp',
        race: 'Ельф',
        skills: { id: 'mock-Ельф-camp', mainSkills: [] },
    };

    it('прогрес змінився між читанням і записом — перечитує й повторює', async () => {
        vi.mocked(prisma.skillTree.findFirst).mockResolvedValueOnce(
            OLD as never
        );
        vi.mocked(prisma.character.findMany).mockResolvedValue([
            { id: 'a' },
        ] as never);
        vi.mocked(prisma.skillTreeProgress.findMany).mockResolvedValue([
            {
                characterId: 'a',
                progress: { 'mock-Ельф-camp': { unlockedSkills: ['o1'] } },
                version: 2,
            },
        ] as never);
        vi.mocked(prisma.skillTreeProgress.findUnique)
            .mockResolvedValueOnce({
                progress: { 'mock-Ельф-camp': { unlockedSkills: ['o1'] } },
                version: 2,
            } as never)
            .mockResolvedValueOnce({
                progress: {
                    'mock-Ельф-camp': { unlockedSkills: ['o1', 'o2'] },
                },
                version: 3,
            } as never);
        vi.mocked(prisma.skillTreeProgress.updateMany)
            .mockResolvedValueOnce({ count: 0 } as never)
            .mockResolvedValueOnce({ count: 1 } as never);

        const res = await patch('row', RAW);

        expect(res.status).toBe(200);
        expect(
            vi.mocked(prisma.skillTreeProgress.updateMany).mock.calls[1][0]
        ).toEqual({
            where: { characterId: 'a', version: 3 },
            data: {
                progress: { row: { unlockedSkills: ['o1', 'o2'] } },
                version: { increment: 1 },
            },
        });
    });

    it('три невдалі спроби — 409, дерево не зберігається', async () => {
        vi.mocked(prisma.skillTree.findFirst).mockResolvedValueOnce(
            OLD as never
        );
        vi.mocked(prisma.character.findMany).mockResolvedValue([
            { id: 'a' },
        ] as never);

        const row = {
            progress: { 'mock-Ельф-camp': { unlockedSkills: ['o1'] } },
            version: 2,
        };

        vi.mocked(prisma.skillTreeProgress.findMany).mockResolvedValue([
            { characterId: 'a', ...row },
        ] as never);
        vi.mocked(prisma.skillTreeProgress.findUnique).mockResolvedValue(
            row as never
        );
        vi.mocked(prisma.skillTreeProgress.updateMany).mockResolvedValue({
            count: 0,
        } as never);

        const res = await patch('row', RAW);

        expect(res.status).toBe(409);
        expect(prisma.skillTreeProgress.updateMany).toHaveBeenCalledTimes(3);
        expect(prisma.skillTree.update).not.toHaveBeenCalled();
    });
});

describe('GET skill trees', () => {
    const list = async () => {
        const { GET } = dispatchedRoute('skill-trees');

        return GET(new Request('http://x'), {
            params: Promise.resolve({ id: 'camp' }),
        });
    };

    beforeEach(() => vi.clearAllMocks());

    it('учасник — список дерев кампанії', async () => {
        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({
            userId: 'u',
            isDM: false,
        } as never);
        vi.mocked(prisma.skillTree.findMany).mockResolvedValue([
            { id: 't1' },
        ] as never);

        expect(await getResponseJson((await list()) as never)).toEqual([
            { id: 't1' },
        ]);
        expect(prisma.skillTree.findMany).toHaveBeenCalledWith({
            where: { campaignId: 'camp' },
        });
    });

    it('не учасник — 403', async () => {
        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
            NextResponse.json({ error: 'x' }, { status: 403 }) as never
        );

        expect((await list()).status).toBe(403);
        expect(prisma.skillTree.findMany).not.toHaveBeenCalled();
    });
});
