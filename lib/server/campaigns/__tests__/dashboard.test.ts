import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
    character: { count: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    scenarioPage: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
    battleScene: { findMany: vi.fn() },
    battleParticipant: { findFirst: vi.fn() },
    worldMap: { count: vi.fn(), findFirst: vi.fn() },
    battleMap: { count: vi.fn() },
    unit: { count: vi.fn() },
    spell: { count: vi.fn() },
    artifact: { count: vi.fn() },
    skill: { count: vi.fn() },
    race: { count: vi.fn() },
    gameClass: { count: vi.fn() },
    background: { count: vi.fn() },
    feat: { count: vi.fn() },
    career: { count: vi.fn() },
    spellGroup: { count: vi.fn() },
    campaign: { findUnique: vi.fn() },
}));

const COUNT_MODELS = [
    'battleMap',
    'unit',
    'spell',
    'artifact',
    'skill',
    'race',
    'gameClass',
    'background',
    'feat',
    'career',
    'spellGroup',
] as const;

const latestPublishedVersion = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({ prisma: db }));
vi.mock('@/lib/server/templates/publish', () => ({ latestPublishedVersion }));

import {
    readDmDashboard,
    readPlayerDashboard,
    readPlayerNavState,
    sourceUpdateState,
} from '@/lib/server/campaigns/dashboard';

const FORBIDDEN = ['participants', 'map', 'snapshot', 'skills', 'abilities'];

function selectsOf(): object[] {
    return Object.values(db).flatMap((m) =>
        typeof m === 'function'
            ? []
            : Object.values(m).flatMap((fn) =>
                  fn.mock.calls.map((c) => c[0]?.select).filter(Boolean)
              )
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    db.character.count.mockResolvedValue(2);
    db.character.findMany.mockResolvedValue([]);
    db.scenarioPage.findMany.mockResolvedValue([{ id: 'p1', title: 'Акт 1' }]);
    db.battleScene.findMany.mockResolvedValue([]);
    db.worldMap.findFirst.mockResolvedValue(null);
    db.$queryRaw.mockResolvedValue([]);
    for (const model of COUNT_MODELS) db[model].count.mockResolvedValue(0);
    db.campaign.findUnique.mockResolvedValue({ createdFromId: null });
});

describe('readDmDashboard', () => {
    it('повертає кількість, сторінки та бої з вузьким select', async () => {
        db.battleScene.findMany.mockResolvedValue([
            { id: 'b1', name: 'Бій', status: 'prepared' },
        ]);

        const res = await readDmDashboard('c1');

        expect(res).toEqual({
            pendingDrafts: 2,
            scenarioPages: [{ id: 'p1', title: 'Акт 1' }],
            battles: [{ id: 'b1', name: 'Бій', status: 'prepared' }],
            sourceUpdate: null,
            latestSession: null,
            libraryCounts: expect.objectContaining({ units: 0, maps: 0 }),
            party: [],
            worldMap: null,
        });

        const arg = db.battleScene.findMany.mock.calls[0][0];

        expect(arg.where.status.in).toEqual(['prepared', 'active']);
        expect(arg.select).toEqual({ id: true, name: true, status: true });
    });

    it('активний бій першим і не більше трьох (сортування в БД)', async () => {
        await readDmDashboard('c1');

        const arg = db.battleScene.findMany.mock.calls[0][0];

        expect(arg.orderBy).toEqual([{ status: 'asc' }, { createdAt: 'desc' }]);
        expect(arg.take).toBe(3);
    });

    it('returns the active player roster and root map for the dashboard', async () => {
        db.character.findMany.mockResolvedValue([
            {
                id: 'h1',
                name: 'Ліра',
                level: 5,
                race: 'Ельфійка',
                class: 'Чарівниця',
                avatar: null,
                armorClass: 15,
                speed: 30,
            },
        ]);
        db.worldMap.findFirst.mockResolvedValue({
            id: 'm1',
            name: 'Briarwood',
            imageUrl: 'https://example.com/map.webp',
        });

        const res = await readDmDashboard('c1');

        expect(res.party).toHaveLength(1);
        expect(res.worldMap).toEqual({
            id: 'm1',
            name: 'Briarwood',
            imageUrl: 'https://example.com/map.webp',
        });
        expect(db.character.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    campaignId: 'c1',
                    type: 'player',
                    status: 'active',
                },
                select: expect.objectContaining({ id: true, name: true }),
            })
        );
        expect(db.worldMap.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { campaignId: 'c1', parentMarkerId: null },
                select: { id: true, name: true, imageUrl: true },
            })
        );
    });

    it('returns the last scene with its last played and next chapter, plus library counts', async () => {
        db.$queryRaw.mockResolvedValue([
            {
                id: 's1',
                title: 'The old bridge',
                subtitle: 'Dusk',
                status: 'ready',
                playedAt: null,
                sectionIds: ['a', 'b', 'c'],
                titles: ['Arrival', 'Toll', 'Crossing'],
                playedIds: ['a', 'b'],
            },
        ]);
        db.unit.count.mockResolvedValue(152);

        const res = await readDmDashboard('c1');

        expect(res.latestSession).toEqual({
            id: 's1',
            title: 'The old bridge',
            subtitle: 'Dusk',
            playedAt: null,
            lastChapter: { id: 'b', title: 'Toll' },
            nextChapter: { id: 'c', title: 'Crossing' },
        });
        expect(res.libraryCounts.units).toBe(152);
        expect(db.unit.count).toHaveBeenCalledWith({
            where: { campaignId: 'c1' },
        });
    });

    it('a fully played scene has no next chapter', async () => {
        db.$queryRaw.mockResolvedValue([
            {
                id: 's1',
                title: 'Done',
                subtitle: null,
                status: 'played',
                playedAt: new Date('2026-11-21T18:00:00.000Z'),
                sectionIds: ['a', 'b'],
                titles: ['One', 'Two'],
                playedIds: ['a', 'b'],
            },
        ]);

        const res = await readDmDashboard('c1');

        expect(res.latestSession?.nextChapter).toBeNull();
        expect(res.latestSession?.lastChapter).toEqual({
            id: 'b',
            title: 'Two',
        });
        expect(res.latestSession?.playedAt).toBe('2026-11-21T18:00:00.000Z');
    });

    it('select без важких полів', async () => {
        await readDmDashboard('c1');

        selectsOf().forEach((s) =>
            FORBIDDEN.forEach((k) => expect(s).not.toHaveProperty(k))
        );
    });
});

describe('readPlayerDashboard', () => {
    beforeEach(() => db.worldMap.count.mockResolvedValue(0));

    it('без героя — порожній результат без запиту учасника', async () => {
        db.character.findFirst.mockResolvedValue(null);

        expect(await readPlayerDashboard('c1', 'u1')).toEqual({
            hero: null,
            activeBattle: null,
            hasWorld: false,
        });
        expect(db.battleParticipant.findFirst).not.toHaveBeenCalled();
    });

    it('герой без бою', async () => {
        db.character.findFirst.mockResolvedValue({ id: 'h1' });
        db.battleParticipant.findFirst.mockResolvedValue(null);

        expect(await readPlayerDashboard('c1', 'u1')).toEqual({
            hero: { id: 'h1' },
            activeBattle: null,
            hasWorld: false,
        });
    });

    it('hasWorld — є коренева карта, також для гравця без героя', async () => {
        db.worldMap.count.mockResolvedValue(2);
        db.character.findFirst.mockResolvedValue(null);

        expect((await readPlayerDashboard('c1', 'u1')).hasWorld).toBe(true);
        expect(db.worldMap.count).toHaveBeenCalledWith({
            where: { campaignId: 'c1', parentMarkerId: null },
        });
    });

    it('герой у бою — hp з tempHp, where з кампанією й active', async () => {
        db.character.findFirst.mockResolvedValue({ id: 'h1' });
        db.battleParticipant.findFirst.mockResolvedValue({
            battleId: 'b1',
            currentHp: 5,
            maxHp: 20,
            tempHp: 3,
        });

        const res = await readPlayerDashboard('c1', 'u1');

        expect(res.activeBattle).toEqual({
            battleId: 'b1',
            hp: { current: 5, max: 20, temp: 3 },
        });
        expect(db.battleParticipant.findFirst.mock.calls[0][0].where).toEqual({
            sourceId: 'h1',
            sourceType: 'character',
            battle: { campaignId: 'c1', status: 'active' },
        });
        selectsOf().forEach((s) =>
            FORBIDDEN.forEach((k) => expect(s).not.toHaveProperty(k))
        );
    });
});

describe('sourceUpdateState', () => {
    const setup = (opts: {
        createdFromId?: string | null;
        source?: number | null;
        sync?: {
            sourceCampaignId: string;
            sourceVersion: number | null;
        } | null;
    }) => {
        db.campaign.findUnique.mockImplementation(
            async ({ where }: { where: { id: string } }) =>
                where.id === 'c1'
                    ? {
                          createdFromId: opts.createdFromId ?? null,
                          sourceSync: opts.sync ?? null,
                      }
                    : opts.source == null
                      ? null
                      : { contentVersion: opts.source }
        );
    };

    it('is null without a source', async () => {
        setup({});

        expect(await sourceUpdateState('c1')).toBeNull();
        expect(db.campaign.findUnique).toHaveBeenCalledTimes(1);
    });

    it('is null when the source is gone', async () => {
        setup({ createdFromId: 's1', source: null });

        expect(await sourceUpdateState('c1')).toBeNull();
    });

    it('has updates when the source is ahead of the synced version', async () => {
        setup({
            createdFromId: 's1',
            source: 5,
            sync: { sourceCampaignId: 's1', sourceVersion: 3 },
        });

        expect(await sourceUpdateState('c1')).toEqual({
            sourceVersion: 5,
            hasUpdates: true,
        });
    });

    it('has no updates when versions match', async () => {
        setup({
            createdFromId: 's1',
            source: 3,
            sync: { sourceCampaignId: 's1', sourceVersion: 3 },
        });

        expect(await sourceUpdateState('c1')).toMatchObject({
            hasUpdates: false,
        });
    });

    it.each([
        [
            'null synced version (old clones)',
            { sourceCampaignId: 's1', sourceVersion: null },
        ],
        ['no sync row', null],
        [
            'sync row for another source',
            { sourceCampaignId: 'other', sourceVersion: 9 },
        ],
    ])('treats %s as having updates', async (_n, sync) => {
        setup({ createdFromId: 's1', source: 1, sync });

        expect(await sourceUpdateState('c1')).toEqual({
            sourceVersion: 1,
            hasUpdates: true,
        });
    });

    describe('layered campaign', () => {
        const layered = (published: number | null) => {
            latestPublishedVersion.mockResolvedValue(published);
            db.campaign.findUnique.mockImplementation(
                async ({ where }: { where: { id: string } }) =>
                    where.id === 'c1'
                        ? {
                              createdFromId: null,
                              baseSourceId: 's1',
                              baseVersion: 5,
                              sourceSync: null,
                          }
                        : { contentVersion: 9 }
            );
        };

        it('ignores edits of the template that were never published', async () => {
            layered(5);

            expect(await sourceUpdateState('c1')).toEqual({
                sourceVersion: 9,
                hasUpdates: false,
            });
        });

        it('has updates once a newer version is published', async () => {
            layered(7);

            expect(await sourceUpdateState('c1')).toEqual({
                sourceVersion: 9,
                hasUpdates: true,
            });
        });

        it('has none for a template that was never published', async () => {
            layered(null);

            expect(await sourceUpdateState('c1')).toMatchObject({
                hasUpdates: false,
            });
        });
    });

    it('readDmDashboard exposes the version only when updates exist', async () => {
        setup({
            createdFromId: 's1',
            source: 5,
            sync: { sourceCampaignId: 's1', sourceVersion: 3 },
        });

        expect((await readDmDashboard('c1')).sourceUpdate).toEqual({
            sourceVersion: 5,
        });

        setup({
            createdFromId: 's1',
            source: 3,
            sync: { sourceCampaignId: 's1', sourceVersion: 3 },
        });

        expect((await readDmDashboard('c1')).sourceUpdate).toBeNull();
    });
});

describe('readPlayerNavState', () => {
    it('returns the world flag and the active battle id without loading the hero card', async () => {
        db.worldMap.count.mockResolvedValue(1);
        db.character.findFirst.mockResolvedValue({ id: 'h1' });
        db.battleParticipant.findFirst.mockResolvedValue({ battleId: 'b1' });

        expect(await readPlayerNavState('c1', 'u1')).toEqual({
            hasWorld: true,
            activeBattleId: 'b1',
        });
        expect(db.character.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({ select: { id: true } })
        );
    });

    it('has no battle id for a player without a hero', async () => {
        db.worldMap.count.mockResolvedValue(0);
        db.character.findFirst.mockResolvedValue(null);

        expect(await readPlayerNavState('c1', 'u1')).toEqual({
            hasWorld: false,
            activeBattleId: undefined,
        });
        expect(db.battleParticipant.findFirst).not.toHaveBeenCalled();
    });
});
