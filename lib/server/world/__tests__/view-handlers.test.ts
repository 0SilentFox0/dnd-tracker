import { beforeEach, describe, expect, it, vi } from 'vitest';

import { viewHandler } from '../view-handlers';

const mocks = vi.hoisted(() => ({
    access: vi.fn(),
    listMaps: vi.fn(),
    detail: vi.fn(),
    heroes: vi.fn(),
    positions: vi.fn(),
    reveals: vi.fn(),
    show: vi.fn(),
    notes: vi.fn(),
    layers: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
    prisma: {
        worldPosition: { findMany: mocks.positions },
        worldReveal: { findMany: mocks.reveals },
        campaignShow: { findUnique: mocks.show },
        worldNote: { findMany: mocks.notes },
    },
}));
vi.mock('@/lib/server/world/map-store', () => ({
    listWorldMaps: mocks.listMaps,
    readWorldMapDetail: mocks.detail,
}));
vi.mock('@/lib/server/world/layer-store', () => ({
    listLayerInputs: mocks.layers,
}));
vi.mock('@/lib/server/world/travel-store', () => ({
    activePlayerHeroes: mocks.heroes,
}));
vi.mock('@/lib/utils/api/api-auth', () => ({
    requireCampaignAccess: mocks.access,
}));

const root = {
    id: 'root',
    name: 'Root',
    parentMarkerId: null,
    parentMapId: null,
    imageUrl: '/root.svg',
    width: 100,
    height: 100,
    fogEnabled: false,
    revealRadius: 0.1,
    entryX: 0.5,
    entryY: 0.5,
    updatedAt: '',
};

const child = {
    id: 'child',
    name: 'Child',
    parentMarkerId: 'marker',
    parentMapId: 'root',
    imageUrl: '/child.svg',
    width: 100,
    height: 100,
    fogEnabled: false,
    revealRadius: 0.1,
    entryX: 0.5,
    entryY: 0.5,
    updatedAt: '',
};

describe('world view Demo access', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.access.mockResolvedValue({
            userId: 'u1',
            isDM: false,
            isDemo: true,
        });
        mocks.listMaps.mockResolvedValue([root, child]);
        mocks.positions.mockResolvedValue([]);
        mocks.reveals.mockResolvedValue([]);
        mocks.heroes.mockResolvedValue([]);
        mocks.show.mockResolvedValue(null);
        mocks.notes.mockResolvedValue([]);
        mocks.layers.mockResolvedValue([]);
        mocks.detail.mockResolvedValue({ map: child, markers: [] });
    });

    it('lets Demo open a child map and returns the full campaign map list', async () => {
        const response = await viewHandler(
            new Request(
                'http://localhost/api/campaigns/demo/world/view?mapId=child'
            ),
            'demo'
        );

        expect(response.status).toBe(200);
        expect(mocks.detail).toHaveBeenCalledWith('child');
        expect(
            (await response.json()).maps.map((map: { id: string }) => map.id)
        ).toEqual(['root', 'child']);
    });
});

describe('world view asParty', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.listMaps.mockResolvedValue([root, child]);
        mocks.positions.mockResolvedValue([]);
        mocks.reveals.mockResolvedValue([]);
        mocks.heroes.mockResolvedValue([
            { id: 'h1', name: 'A', avatar: null, controlledBy: null },
            { id: 'h2', name: 'B', avatar: null, controlledBy: null },
        ]);
        mocks.show.mockResolvedValue(null);
        mocks.notes.mockResolvedValue([]);
        mocks.layers.mockResolvedValue([]);
        mocks.detail.mockResolvedValue({ map: root, markers: [] });
    });

    const call = () =>
        viewHandler(
            new Request(
                'http://localhost/api/campaigns/c/world/view?mapId=root&asParty=1'
            ),
            'c'
        );

    it('builds one view from the reveals of every active hero for the DM', async () => {
        mocks.access.mockResolvedValue({
            userId: 'u1',
            isDM: true,
            isDemo: false,
        });

        const response = await call();

        expect(response.status).toBe(200);
        expect(mocks.heroes).toHaveBeenCalledWith('c', {});
        expect(mocks.reveals).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { characterId: { in: ['h1', 'h2'] } },
            })
        );
    });

    it('is DM only', async () => {
        mocks.access.mockResolvedValue({
            userId: 'u1',
            isDM: false,
            isDemo: false,
        });

        expect((await call()).status).toBe(403);
    });
});

describe('world view layers', () => {
    const marker = {
        id: 'mk-secret-id',
        mapId: 'root',
        kind: 'point',
        x: 0.5,
        y: 0.5,
        polygon: null,
        name: 'Hidden vault',
        icon: null,
        color: null,
        dmNote: null,
        description: null,
        alwaysVisible: false,
        sortOrder: 0,
        childMapId: null,
        layerId: 'l1',
    };

    const heroesLayer = {
        id: 'l1',
        name: 'Secret layer name',
        color: null,
        visibility: 'heroes',
        heroIds: ['h2'],
        imageUrl: '/secret-layer.webp',
        rect: { x: 0, y: 0, w: 1, h: 1 },
        opacity: 1,
    };

    const call = (query = '') =>
        viewHandler(
            new Request(
                `http://localhost/api/campaigns/c/world/view?mapId=root${query}`
            ),
            'c'
        );

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.listMaps.mockResolvedValue([root]);
        mocks.positions.mockResolvedValue([]);
        mocks.reveals.mockResolvedValue([]);
        mocks.show.mockResolvedValue(null);
        mocks.notes.mockResolvedValue([]);
        mocks.detail.mockResolvedValue({ map: root, markers: [marker] });
        mocks.layers.mockResolvedValue([heroesLayer]);
    });

    it('a player without the hero gets no layer, image url or marker id', async () => {
        mocks.access.mockResolvedValue({
            userId: 'u1',
            isDM: false,
            isDemo: false,
        });
        mocks.heroes.mockResolvedValue([
            { id: 'h1', name: 'A', avatar: null, controlledBy: 'u1' },
        ]);

        const res = await call();

        const text = JSON.stringify(await res.json());

        expect(res.status).toBe(200);
        expect(mocks.layers).toHaveBeenCalledWith('root');
        expect(text).not.toContain('Secret layer name');
        expect(text).not.toContain('secret-layer.webp');
        expect(text).not.toContain('mk-secret-id');
    });

    it('the DM through the eyes of a hero sees what that hero sees', async () => {
        mocks.heroes.mockResolvedValue([
            { id: 'h2', name: 'B', avatar: null, controlledBy: 'u2' },
        ]);

        mocks.access.mockResolvedValue({
            userId: 'u2',
            isDM: false,
            isDemo: false,
        });

        const asPlayer = await (await call()).json();

        mocks.access.mockResolvedValue({
            userId: 'dm',
            isDM: true,
            isDemo: false,
        });

        const asDm = await (await call('&asHeroId=h2')).json();

        expect(asDm.markers).toEqual(asPlayer.markers);
        expect(asDm.layers).toEqual(asPlayer.layers);
        expect(asDm.layers.map((l: { id: string }) => l.id)).toEqual(['l1']);
    });

    it('a demo campaign without layers does not fail', async () => {
        mocks.access.mockResolvedValue({
            userId: 'u1',
            isDM: false,
            isDemo: true,
        });
        mocks.heroes.mockResolvedValue([]);
        mocks.layers.mockResolvedValue([]);
        mocks.detail.mockResolvedValue({ map: root, markers: [] });

        const res = await call();

        expect(res.status).toBe(200);
        expect((await res.json()).layers).toEqual([]);
    });
});
