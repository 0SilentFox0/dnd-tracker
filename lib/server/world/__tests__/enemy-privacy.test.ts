import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
    access: vi.fn(),
    listMaps: vi.fn(),
    detail: vi.fn(),
    heroes: vi.fn(),
    positions: vi.fn(),
    reveals: vi.fn(),
    show: vi.fn(),
    notes: vi.fn(),
    logs: vi.fn(),
    chars: vi.fn(),
    sessions: vi.fn(),
    enemyFind: vi.fn(),
    enemies: vi.fn(),
    layers: vi.fn(),
}));

const ENEMY = {
    id: 'enemy-secret-id',
    mapId: 'root',
    name: 'Hidden Lich',
    icon: null,
    color: null,
    dmNote: 'ambush',
    x: 0.4,
    y: 0.4,
};

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
    prisma: {
        worldPosition: { findMany: m.positions },
        worldReveal: { findMany: m.reveals },
        campaignShow: { findUnique: m.show },
        worldNote: { findMany: m.notes },
        worldTravelLog: { findMany: m.logs },
        character: { findMany: m.chars },
        worldEnemyPin: { findMany: m.enemyFind },
    },
}));
vi.mock('@/lib/server/world/map-store', () => ({
    listWorldMaps: m.listMaps,
    readWorldMapDetail: m.detail,
}));
vi.mock('@/lib/server/world/layer-store', () => ({
    listLayerInputs: m.layers,
}));
vi.mock('@/lib/server/world/enemy-store', () => ({
    listEnemies: m.enemies,
}));
vi.mock('@/lib/server/world/travel-store', () => ({
    activePlayerHeroes: m.heroes,
}));
vi.mock('@/lib/server/world/session-store', () => ({
    listSessions: m.sessions,
}));
vi.mock('@/lib/utils/api/api-auth', () => ({
    requireCampaignAccess: m.access,
}));

import { trailHandler } from '../trail-handlers';
import { viewHandler } from '../view-handlers';

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

beforeEach(() => {
    vi.clearAllMocks();
    m.access.mockResolvedValue({ userId: 'u2', isDM: false, isDemo: false });
    m.listMaps.mockResolvedValue([root]);
    m.detail.mockResolvedValue({ map: root, markers: [] });
    m.heroes.mockResolvedValue([
        { id: 'h1', name: 'Aria', avatar: null, controlledBy: 'u2' },
    ]);
    m.positions.mockResolvedValue([]);
    m.reveals.mockResolvedValue([]);
    m.show.mockResolvedValue(null);
    m.notes.mockResolvedValue([]);
    m.logs.mockResolvedValue([]);
    m.chars.mockResolvedValue([{ id: 'h1', name: 'Aria' }]);
    m.sessions.mockResolvedValue([]);
    m.enemies.mockResolvedValue([ENEMY]);
    m.enemyFind.mockResolvedValue([ENEMY]);
    m.layers.mockResolvedValue([
        {
            id: 'l1',
            name: 'Open layer',
            color: null,
            visibility: 'all',
            heroIds: [],
            imageUrl: null,
            rect: { x: 0, y: 0, w: 1, h: 1 },
            opacity: 1,
        },
    ]);
});

describe('enemy pin privacy', () => {
    it('the player view response never carries enemies', async () => {
        const res = await viewHandler(
            new Request(
                'http://localhost/api/campaigns/c1/world/view?mapId=root'
            ),
            'c1'
        );

        const text = JSON.stringify(await res.json());

        expect(res.status).toBe(200);
        expect(text).not.toContain(ENEMY.name);
        expect(text).not.toContain(ENEMY.id);
        expect(text).not.toContain('enemies');

        const { layers } = JSON.parse(text);

        expect(layers).toHaveLength(1);
        expect(JSON.stringify(layers)).not.toContain('dmNote');
        expect(m.enemies).not.toHaveBeenCalled();
        expect(m.enemyFind).not.toHaveBeenCalled();
    });

    it('the trail response never carries enemies', async () => {
        const res = await trailHandler(
            new Request(
                'http://localhost/api/campaigns/c1/world/trail?mapId=root'
            ),
            'c1'
        );

        const text = JSON.stringify(await res.json());

        expect(text).not.toContain(ENEMY.name);
        expect(text).not.toContain(ENEMY.id);
        expect(m.enemies).not.toHaveBeenCalled();
        expect(m.enemyFind).not.toHaveBeenCalled();
    });
});
