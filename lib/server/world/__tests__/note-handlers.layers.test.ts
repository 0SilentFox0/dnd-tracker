import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
    ownedMarker: vi.fn(),
    detail: vi.fn(),
    layers: vi.fn(),
    heroes: vi.fn(),
    scope: vi.fn(),
    noteCreate: vi.fn(),
    access: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
    prisma: { worldNote: { create: m.noteCreate } },
}));
vi.mock('@/lib/server/world/map-handlers', () => ({
    ownedMarker: m.ownedMarker,
}));
vi.mock('@/lib/server/world/map-store', () => ({
    readWorldMapDetail: m.detail,
}));
vi.mock('@/lib/server/world/layer-store', () => ({
    listLayerInputs: m.layers,
}));
vi.mock('@/lib/server/world/note-store', () => ({
    noteInclude: {},
    toNote: (v: unknown) => v,
}));
vi.mock('@/lib/server/world/travel-store', () => ({
    activePlayerHeroes: m.heroes,
}));
vi.mock('@/lib/server/world/view-handlers', () => ({
    readViewerScope: m.scope,
}));
vi.mock('@/lib/server/world/world-events', () => ({
    publishWorldChanged: vi.fn(),
}));
vi.mock('@/lib/utils/api/as-dm', () => ({
    withAccess: async (
        _c: string,
        _a: string,
        run: (access: unknown) => Promise<NextResponse>
    ) => run(m.access()),
    withDM: vi.fn(),
}));

import { createNoteHandler } from '../note-handlers';

const map = {
    id: 'root',
    name: 'Root',
    parentMarkerId: null,
    parentMapId: null,
    imageUrl: '/r.svg',
    width: 100,
    height: 100,
    fogEnabled: false,
    revealRadius: 0.1,
    entryX: 0.5,
    entryY: 0.5,
    updatedAt: '',
};

const marker = {
    id: 'mk1',
    mapId: 'root',
    kind: 'point',
    x: 0.5,
    y: 0.5,
    polygon: null,
    name: 'M',
    icon: null,
    color: null,
    dmNote: null,
    description: null,
    alwaysVisible: false,
    sortOrder: 0,
    childMapId: null,
    layerId: 'l1',
};

const layer = (visibility: string) => ({
    id: 'l1',
    name: 'L',
    color: null,
    visibility,
    heroIds: [],
    imageUrl: null,
    rect: { x: 0, y: 0, w: 1, h: 1 },
    opacity: 1,
});

const req = () =>
    new Request('http://localhost/x', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            markerId: 'mk1',
            text: 'hello',
            visibility: 'public',
        }),
    });

describe('createNoteHandler with layers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        m.access.mockReturnValue({ userId: 'u1', isDM: false, isDemo: false });
        m.ownedMarker.mockResolvedValue({ id: 'mk1', mapId: 'root' });
        m.heroes.mockResolvedValue([{ id: 'h1' }]);
        m.scope.mockResolvedValue({ reveals: [], allowed: new Set(['root']) });
        m.detail.mockResolvedValue({ map, markers: [marker] });
        m.noteCreate.mockResolvedValue({
            id: 'n1',
            visibility: 'public',
        });
    });

    it('rejects a note on a marker of a dm layer with 403', async () => {
        m.layers.mockResolvedValue([layer('dm')]);

        const res = await createNoteHandler(req(), 'c1');

        expect(res.status).toBe(403);
        expect(m.layers).toHaveBeenCalledWith('root');
        expect(m.noteCreate).not.toHaveBeenCalled();
    });

    it('allows a note on a marker of an all layer', async () => {
        m.layers.mockResolvedValue([layer('all')]);

        const res = await createNoteHandler(req(), 'c1');

        expect(res.status).toBe(201);
        expect(m.noteCreate).toHaveBeenCalled();
    });
});
