import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
    character: { count: vi.fn(), findFirst: vi.fn() },
    scenarioPage: { findMany: vi.fn() },
    battleScene: { findMany: vi.fn() },
    battleParticipant: { findFirst: vi.fn() },
    worldMap: { count: vi.fn() },
    campaign: { findUnique: vi.fn() },
}));

const latestPublishedVersion = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({ prisma: db }));
vi.mock('@/lib/server/templates/publish', () => ({ latestPublishedVersion }));

import {
    readDmDashboard,
    readPlayerDashboard,
    sourceUpdateState,
} from '@/lib/server/campaigns/dashboard';

const FORBIDDEN = ['participants', 'map', 'snapshot', 'skills', 'abilities'];

function selectsOf(): object[] {
    return Object.values(db).flatMap((m) =>
        Object.values(m).flatMap((fn) =>
            fn.mock.calls.map((c) => c[0]?.select).filter(Boolean)
        )
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    db.character.count.mockResolvedValue(2);
    db.scenarioPage.findMany.mockResolvedValue([{ id: 'p1', title: 'Акт 1' }]);
    db.battleScene.findMany.mockResolvedValue([]);
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
        });

        const arg = db.battleScene.findMany.mock.calls[0][0];

        expect(arg.where.status.in).toEqual(['prepared', 'active']);
        expect(arg.select).toEqual({ id: true, name: true, status: true });
    });

    it('активний бій першим і не більше трьох', async () => {
        db.battleScene.findMany.mockResolvedValue([
            { id: 'p1', name: 'a', status: 'prepared' },
            { id: 'p2', name: 'b', status: 'prepared' },
            { id: 'p3', name: 'c', status: 'prepared' },
            { id: 'a1', name: 'd', status: 'active' },
        ]);

        const res = await readDmDashboard('c1');

        expect(res.battles.map((b) => b.id)).toEqual(['a1', 'p1', 'p2']);
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
