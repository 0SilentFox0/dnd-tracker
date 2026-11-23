import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    access: vi.fn(),
    dm: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    marker: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    track: vi.fn(),
    untrack: vi.fn(),
    visible: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
    prisma: {
        quest: {
            findMany: mocks.findMany,
            findFirst: mocks.findFirst,
            create: mocks.create,
            update: mocks.update,
            deleteMany: mocks.remove,
        },
        worldMarker: { findFirst: mocks.marker },
        questTracking: { upsert: mocks.track, deleteMany: mocks.untrack },
    },
}));
vi.mock('@/lib/utils/api/api-auth', () => ({
    requireCampaignAccess: mocks.access,
    requireDM: mocks.dm,
}));
vi.mock('@/lib/server/quests/visible-markers', () => ({
    questVisibleMarkers: mocks.visible,
}));
import {
    deleteQuestHandler,
    listQuestsHandler,
    saveQuestHandler,
    trackQuestHandler,
} from '@/lib/server/quests/handlers';
import { readQuests } from '@/lib/server/quests/store';

const request = (body: unknown) =>
    new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify(body),
    });

const actor = { userId: 'player', isDM: false };

beforeEach(() => {
    vi.clearAllMocks();
    mocks.access.mockResolvedValue(actor);
    mocks.dm.mockResolvedValue(
        NextResponse.json({ error: 'forbidden' }, { status: 403 })
    );
    mocks.visible.mockResolvedValue(new Set());
});
describe('quest access boundary', () => {
    it('filters player queries and strips objective secrets and hidden map names', async () => {
        mocks.findMany.mockResolvedValue([
            {
                id: 'q',
                title: 'Known',
                description: '',
                kind: 'main',
                status: 'active',
                visible: true,
                notes: '',
                reward: '',
                tracking: [],
                marker: {
                    id: 'secret-marker',
                    mapId: 'secret-map',
                    name: 'Secret location',
                },
                objectives: [
                    {
                        id: 'secret-objective',
                        title: 'Password',
                        visible: false,
                        completed: true,
                    },
                ],
            },
        ]);

        const response = await readQuests('campaign', actor);

        expect(mocks.findMany.mock.calls[0][0].where).toEqual({
            campaignId: 'campaign',
            visible: true,
        });
        expect(response.items[0].objectives).toEqual([{ hidden: true }]);
        expect(response.items[0].marker).toBeNull();
        expect(JSON.stringify(response)).not.toMatch(/Password|secret/);
    });
    it('does not read quests for non-members', async () => {
        mocks.access.mockResolvedValue(
            NextResponse.json({ error: 'forbidden' }, { status: 403 })
        );
        expect((await listQuestsHandler('campaign')).status).toBe(403);
        expect(mocks.findMany).not.toHaveBeenCalled();
    });
    it('rejects player create, update and delete before database mutation', async () => {
        expect(
            (await saveQuestHandler(request({ title: 'q' }), 'c')).status
        ).toBe(403);
        expect(
            (await saveQuestHandler(request({ title: 'q' }), 'c', 'q')).status
        ).toBe(403);
        expect((await deleteQuestHandler('c', 'q')).status).toBe(403);
        expect(mocks.create).not.toHaveBeenCalled();
        expect(mocks.update).not.toHaveBeenCalled();
        expect(mocks.remove).not.toHaveBeenCalled();
    });
    it('rejects markers from another campaign', async () => {
        mocks.dm.mockResolvedValue({ ...actor, isDM: true });
        mocks.marker.mockResolvedValue(null);
        expect(
            (
                await saveQuestHandler(
                    request({ title: 'q', markerId: 'foreign' }),
                    'c'
                )
            ).status
        ).toBe(404);
        expect(mocks.marker.mock.calls[0][0].where).toEqual({
            id: 'foreign',
            map: { campaignId: 'c' },
        });
        expect(mocks.create).not.toHaveBeenCalled();
    });
    it('rejects updates to quests outside the campaign', async () => {
        mocks.dm.mockResolvedValue({ ...actor, isDM: true });
        mocks.findFirst.mockResolvedValue(null);
        expect(
            (await saveQuestHandler(request({ title: 'q' }), 'c', 'foreign'))
                .status
        ).toBe(404);
        expect(mocks.update).not.toHaveBeenCalled();
    });
    it('cannot track hidden quests and uses current user identity', async () => {
        mocks.findFirst.mockResolvedValue(null);
        expect(
            (await trackQuestHandler(request({ tracked: true }), 'c', 'hidden'))
                .status
        ).toBe(404);
        expect(mocks.findFirst.mock.calls[0][0].where).toEqual({
            id: 'hidden',
            campaignId: 'c',
            visible: true,
        });
        expect(mocks.track).not.toHaveBeenCalled();
        mocks.findFirst.mockResolvedValue({ id: 'visible' });
        expect(
            (
                await trackQuestHandler(
                    request({ tracked: true }),
                    'c',
                    'visible'
                )
            ).status
        ).toBe(200);
        expect(mocks.track.mock.calls[0][0].create).toEqual({
            questId: 'visible',
            userId: 'player',
        });
        expect(
            (
                await trackQuestHandler(
                    request({ tracked: true, userId: 'other' }),
                    'c',
                    'visible'
                )
            ).status
        ).toBe(400);
    });
    it('preserves DM visibility and only returns tracking for the current user', async () => {
        mocks.findMany.mockResolvedValue([]);
        await readQuests('c', { ...actor, isDM: true });
        expect(mocks.findMany.mock.calls[0][0].where).toEqual({
            campaignId: 'c',
        });
        expect(mocks.findMany.mock.calls[0][0].include.tracking.where).toEqual({
            userId: 'player',
        });
    });
});
