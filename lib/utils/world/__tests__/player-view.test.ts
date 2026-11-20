import { describe, expect, it } from 'vitest';

import {
    buildWorldView,
    knownMapIds,
    type LayerInput,
    layerVisibleTo,
    type NoteRow,
    visibleMarkerIds,
    type WorldViewInput,
} from '../player-view';

import type {
    HeroPosition,
    WorldMap,
    WorldMapSummary,
    WorldMarker,
} from '@/types/world';

const map: WorldMap = {
    id: 'root',
    name: 'Світ',
    parentMarkerId: null,
    parentMapId: null,
    imageUrl: 'u',
    width: 1000,
    height: 1000,
    fogEnabled: true,
    revealRadius: 0.1,
    entryX: 0.5,
    entryY: 0.5,
    updatedAt: '',
};

const marker = (
    id: string,
    x: number,
    y: number,
    extra: Partial<WorldMarker> = {}
): WorldMarker => ({
    id,
    mapId: 'root',
    kind: 'point',
    x,
    y,
    polygon: null,
    name: id,
    icon: null,
    color: null,
    dmNote: 'secret',
    description: null,
    alwaysVisible: false,
    sortOrder: 0,
    childMapId: null,
    layerId: null,
    ...extra,
});

const summary = (m: WorldMap): WorldMapSummary => ({
    id: m.id,
    name: m.name,
    parentMarkerId: m.parentMarkerId,
    parentMapId: m.parentMapId,
    imageUrl: m.imageUrl,
    width: m.width,
    height: m.height,
});

const heroNames = new Map([
    ['h1', { name: 'Один', avatar: null, controlledBy: 'u1' }],
    ['h2', { name: 'Два', avatar: null, controlledBy: 'u2' }],
]);

const note = (
    id: string,
    markerId: string,
    authorUserId: string,
    visibility: 'public' | 'private'
): NoteRow => ({
    id,
    markerId,
    authorUserId,
    authorName: authorUserId,
    characterId: null,
    visibility,
    text: id,
    createdAt: '',
    updatedAt: '',
});

const layer = (id: string, over: Partial<LayerInput> = {}): LayerInput => ({
    id,
    name: `Layer ${id}`,
    color: null,
    visibility: 'dm',
    heroIds: [],
    imageUrl: `/${id}.webp`,
    rect: { x: 0, y: 0, w: 1, h: 1 },
    opacity: 1,
    ...over,
});

const input = (over: Partial<WorldViewInput> = {}): WorldViewInput => ({
    map,
    markers: [marker('near', 0.5, 0.5), marker('far', 0.9, 0.9)],
    layers: [],
    allMaps: [summary(map)],
    positions: [{ characterId: 'h1', mapId: 'root', x: 0.5, y: 0.5 }],
    heroNames,
    reveals: [
        { mapId: 'root', characterId: 'h1', shape: { t: 'p', x: 0.5, y: 0.5 } },
    ],
    notes: [],
    viewer: { userId: 'u1', heroIds: ['h1'] },
    ...over,
});

describe('buildWorldView', () => {
    it('hides markers outside own reveals and clears dmNote', () => {
        const v = buildWorldView(input());

        expect(v.markers.map((m) => m.id)).toEqual(['near']);
        expect(v.markers.every((m) => m.dmNote === null)).toBe(true);
    });

    it("does not leak another hero's reveals", () => {
        const v = buildWorldView(
            input({
                reveals: [
                    {
                        mapId: 'root',
                        characterId: 'h2',
                        shape: { t: 'p', x: 0.9, y: 0.9 },
                    },
                ],
            })
        );

        expect(v.markers).toEqual([]);
        expect(v.reveals).toEqual([]);
    });

    it('alwaysVisible shows in fog', () => {
        const v = buildWorldView(
            input({
                markers: [marker('far', 0.9, 0.9, { alwaysVisible: true })],
            })
        );

        expect(v.markers.map((m) => m.id)).toEqual(['far']);
    });

    it('zone touching a reveal is visible with its full polygon', () => {
        const polygon: [number, number][] = [
            [0.55, 0.4],
            [0.95, 0.4],
            [0.95, 0.9],
            [0.55, 0.9],
        ];

        const v = buildWorldView(
            input({
                markers: [marker('z', 0.75, 0.65, { kind: 'zone', polygon })],
            })
        );

        expect(v.markers[0].polygon).toEqual(polygon);
    });

    it('private notes of others are not returned; notes only for visible markers', () => {
        const v = buildWorldView(
            input({
                notes: [
                    note('pub', 'near', 'u2', 'public'),
                    note('theirs', 'near', 'u2', 'private'),
                    note('mine', 'near', 'u1', 'private'),
                    note('hidden', 'far', 'u2', 'public'),
                ],
            })
        );

        expect(v.notes.map((n) => n.id).sort()).toEqual(['mine', 'pub']);
        expect(v.notes.find((n) => n.id === 'mine')?.mine).toBe(true);
        expect(v.notes.find((n) => n.id === 'pub')?.mine).toBe(false);
    });

    it('player without heroes sees an empty fogged view', () => {
        const v = buildWorldView(
            input({ viewer: { userId: 'u3', heroIds: [] }, reveals: [] })
        );

        expect(v.markers).toEqual([]);
        expect(v.heroes).toEqual([]);
        expect(v.fog).toBe(true);
    });

    it('fogEnabled=false shows everything', () => {
        const v = buildWorldView(
            input({
                map: { ...map, fogEnabled: false },
                positions: [
                    { characterId: 'h1', mapId: 'root', x: 0.5, y: 0.5 },
                    { characterId: 'h2', mapId: 'root', x: 0.9, y: 0.1 },
                ],
            })
        );

        expect(v.markers).toHaveLength(2);
        expect(v.reveals).toEqual([]);
        expect(v.fog).toBe(false);
        expect(v.heroes.map((h) => [h.id, h.own])).toEqual([
            ['h1', true],
            ['h2', false],
        ]);
    });

    it('other heroes are shown only when revealed', () => {
        const positions: HeroPosition[] = [
            { characterId: 'h1', mapId: 'root', x: 0.5, y: 0.5 },
            { characterId: 'h2', mapId: 'root', x: 0.55, y: 0.5 },
        ];

        expect(
            buildWorldView(input({ positions })).heroes.map((h) => h.id)
        ).toEqual(['h1', 'h2']);
        expect(
            buildWorldView(
                input({
                    positions: [
                        positions[0],
                        { ...positions[1], x: 0.9, y: 0.9 },
                    ],
                })
            ).heroes.map((h) => h.id)
        ).toEqual(['h1']);
    });

    it('hero on a nested map is drawn on the entry marker of the parent', () => {
        const child: WorldMap = {
            ...map,
            id: 'child',
            parentMarkerId: 'gate',
            parentMapId: 'root',
        };

        const v = buildWorldView(
            input({
                markers: [marker('gate', 0.5, 0.5, { childMapId: 'child' })],
                allMaps: [summary(map), summary(child)],
                positions: [
                    { characterId: 'h1', mapId: 'child', x: 0.1, y: 0.1 },
                ],
                reveals: [
                    {
                        mapId: 'child',
                        characterId: 'h1',
                        shape: { t: 'p', x: 0.1, y: 0.1 },
                    },
                ],
                notes: [],
            })
        );

        expect(v.heroes).toEqual([
            expect.objectContaining({
                id: 'h1',
                mapId: 'root',
                x: 0.5,
                y: 0.5,
                own: true,
            }),
        ]);
        expect(v.maps.map((m) => m.id)).toEqual(['root', 'child']);
    });

    it("maps list excludes maps the viewer's heroes never touched", () => {
        const other: WorldMap = {
            ...map,
            id: 'other',
            parentMarkerId: 'k2',
            parentMapId: 'root',
        };

        const v = buildWorldView(
            input({ allMaps: [summary(map), summary(other)] })
        );

        expect(v.maps.map((m) => m.id)).toEqual(['root']);
    });

    it('Demo viewers can open every campaign map without hero reveal state', () => {
        const child: WorldMap = {
            ...map,
            id: 'child',
            parentMarkerId: 'near',
            parentMapId: 'root',
        };

        const other: WorldMap = {
            ...map,
            id: 'other',
            parentMarkerId: 'far',
            parentMapId: 'root',
        };

        const v = buildWorldView(
            input({
                allMaps: [summary(map), summary(child), summary(other)],
                viewer: { userId: 'u3', heroIds: [], isDemo: true },
                positions: [],
                reveals: [],
            })
        );

        expect(v.maps.map((m) => m.id)).toEqual(['root', 'child', 'other']);
    });

    it('aspect 3: vertical reveal reach is shorter', () => {
        const wide: WorldMap = { ...map, width: 3000, height: 1000 };

        const v = buildWorldView(
            input({ map: wide, markers: [marker('v', 0.5, 0.5 + 0.3 * 1.1)] })
        );

        expect(v.markers).toEqual([]);
    });

    it("DM as hero never gets the DM's own private notes", () => {
        const v = buildWorldView(
            input({
                notes: [
                    note('dmPrivate', 'near', 'dm', 'private'),
                    note('dmPublic', 'near', 'dm', 'public'),
                    note('heroPrivate', 'near', 'u1', 'private'),
                ],
                viewer: { userId: 'dm', heroIds: ['h1'], asHero: true },
            })
        );

        expect(v.notes.map((n) => n.id)).toEqual(['dmPublic']);
        expect(v.notes[0].mine).toBe(false);
    });

    it('visibleMarkerIds matches the markers of the view', () => {
        const i = input();

        expect([...visibleMarkerIds(i)]).toEqual(
            buildWorldView(i).markers.map((m) => m.id)
        );
        expect(
            visibleMarkerIds(
                input({ viewer: { userId: 'u9', heroIds: [] } })
            ).has('near')
        ).toBe(false);
    });

    it('knownMapIds adds ancestors of maps the heroes touched', () => {
        const child: WorldMap = {
            ...map,
            id: 'child',
            parentMarkerId: 'near',
            parentMapId: 'root',
        };

        const all = [summary(map), summary(child)];

        expect(
            [
                ...knownMapIds(
                    all,
                    ['h1'],
                    [{ characterId: 'h1', mapId: 'child', x: 0, y: 0 }],
                    []
                ),
            ].sort()
        ).toEqual(['child', 'root']);
        expect([
            ...knownMapIds(
                all,
                [],
                [{ characterId: 'h1', mapId: 'child', x: 0, y: 0 }],
                []
            ),
        ]).toEqual([]);
    });
});

describe('layer visibility', () => {
    const layered = (l: LayerInput, over: Partial<WorldViewInput> = {}) =>
        input({
            markers: [marker('near', 0.5, 0.5, { layerId: l.id })],
            layers: [l],
            ...over,
        });

    it('layerVisibleTo follows the visibility mode', () => {
        expect(layerVisibleTo({ visibility: 'dm', heroIds: ['h1'] }, ['h1'])).toBe(
            false
        );
        expect(layerVisibleTo({ visibility: 'all', heroIds: [] }, [])).toBe(true);
        expect(
            layerVisibleTo({ visibility: 'heroes', heroIds: ['h1'] }, ['h1', 'h2'])
        ).toBe(true);
        expect(
            layerVisibleTo({ visibility: 'heroes', heroIds: ['h1'] }, ['h2'])
        ).toBe(false);
    });

    it('a dm layer hides both the marker and the layer', () => {
        const v = buildWorldView(layered(layer('l1')));

        expect(v.markers).toEqual([]);
        expect(v.layers).toEqual([]);
    });

    it('an all layer shows the marker and the layer', () => {
        const v = buildWorldView(layered(layer('l1', { visibility: 'all' })));

        expect(v.markers.map((m) => m.id)).toEqual(['near']);
        expect(v.layers.map((l) => l.id)).toEqual(['l1']);
    });

    it('a heroes layer is shown only to listed heroes', () => {
        const l = layer('l1', { visibility: 'heroes', heroIds: ['h1'] });

        expect(buildWorldView(layered(l)).markers).toHaveLength(1);
        expect(
            buildWorldView(
                layered(l, {
                    viewer: { userId: 'u2', heroIds: ['h2'] },
                })
            ).layers
        ).toEqual([]);
    });

    it('an asHero viewer with one hero follows that hero rules', () => {
        const l = layer('l1', { visibility: 'heroes', heroIds: ['h2'] });

        const v = buildWorldView(
            layered(l, {
                viewer: { userId: 'u1', heroIds: ['h1'], asHero: true },
            })
        );

        expect(v.markers).toEqual([]);
        expect(v.layers).toEqual([]);
    });

    it('a marker with an unknown layer is hidden (fail closed)', () => {
        const v = buildWorldView(
            input({ markers: [marker('near', 0.5, 0.5, { layerId: 'gone' })] })
        );

        expect(v.markers).toEqual([]);
    });

    it('fog still applies to a visible layer; alwaysVisible bypasses fog', () => {
        const l = layer('l1', { visibility: 'all' });

        const hidden = buildWorldView(
            input({
                markers: [marker('far', 0.9, 0.9, { layerId: 'l1' })],
                layers: [l],
            })
        );

        const always = buildWorldView(
            input({
                markers: [
                    marker('far', 0.9, 0.9, { layerId: 'l1', alwaysVisible: true }),
                ],
                layers: [l],
            })
        );

        expect(hidden.markers).toEqual([]);
        expect(always.markers.map((m) => m.id)).toEqual(['far']);
    });

    it('the output layer carries no visibility or heroIds keys', () => {
        const v = buildWorldView(
            layered(layer('l1', { visibility: 'heroes', heroIds: ['h1'] }))
        );

        expect(Object.keys(v.layers[0]).sort()).toEqual([
            'color',
            'id',
            'imageUrl',
            'name',
            'opacity',
            'rect',
        ]);
    });

    it('a note on a marker of a hidden layer is not returned', () => {
        const v = buildWorldView(
            layered(layer('l1'), { notes: [note('n1', 'near', 'u9', 'public')] })
        );

        expect(v.notes).toEqual([]);
    });

    it('entering a nested map from a hidden-layer marker reveals neither marker nor layer', () => {
        const child: WorldMap = {
            ...map,
            id: 'child',
            parentMarkerId: 'gate',
            parentMapId: 'root',
        };

        const v = buildWorldView(
            input({
                markers: [
                    marker('gate', 0.5, 0.5, { childMapId: 'child', layerId: 'l1' }),
                ],
                layers: [layer('l1')],
                allMaps: [summary(map), summary(child)],
                positions: [
                    { characterId: 'h1', mapId: 'child', x: 0.1, y: 0.1 },
                ],
            })
        );

        expect(v.markers).toEqual([]);
        expect(v.layers).toEqual([]);
        expect(v.heroes).toEqual([]);
    });

    it('visibleMarkerIds respects layers', () => {
        expect(visibleMarkerIds(layered(layer('l1'))).has('near')).toBe(false);
        expect(
            visibleMarkerIds(layered(layer('l1', { visibility: 'all' }))).has('near')
        ).toBe(true);
    });
});
