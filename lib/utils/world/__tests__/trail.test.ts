import { describe, expect, it } from 'vitest';

import { buildTrails, filterTrailForViewer } from '@/lib/utils/world/trail';
import type { TrailRow } from '@/lib/utils/world/trail';
import type { TrailEntry } from '@/types/world';

const hero = { id: 'h1', name: 'Aria' };

const entry = (over: Partial<TrailEntry> & { id: string }): TrailEntry => ({
    sessionId: 's1',
    kind: 'travel',
    heroes: [hero],
    from: { x: 0.1, y: 0.1 },
    to: { x: 0.5, y: 0.5 },
    at: '2026-01-01T10:00:00.000Z',
    ...over,
});

describe('buildTrails', () => {
    it('builds a node and a segment for a travel entry', () => {
        const [trail] = buildTrails([entry({ id: 'e1' })], 1);

        expect(trail.nodes).toHaveLength(1);
        expect(trail.nodes[0]).toMatchObject({ entryId: 'e1', x: 0.5, y: 0.5 });
        expect(trail.segments).toEqual([
            { entryId: 'e1', from: { x: 0.1, y: 0.1 }, to: { x: 0.5, y: 0.5 } },
        ]);
    });

    it('gives a node only when from is null', () => {
        const [trail] = buildTrails([entry({ id: 'e1', from: null })], 1);

        expect(trail.nodes).toHaveLength(1);
        expect(trail.segments).toHaveLength(0);
    });

    it('skips the segment when from equals to', () => {
        const [trail] = buildTrails(
            [entry({ id: 'e1', from: { x: 0.5, y: 0.5 } })],
            1
        );

        expect(trail.segments).toHaveLength(0);
        expect(trail.nodes).toHaveLength(1);
    });

    it.each(['enter', 'exit', 'rest'] as const)(
        'gives only a node for %s',
        (kind) => {
            const [trail] = buildTrails([entry({ id: 'e1', kind })], 1);

            expect(trail.segments).toHaveLength(0);
            expect(trail.nodes[0].kind).toBe(kind);
        }
    );

    it('merges consecutive nodes within epsilon', () => {
        const [trail] = buildTrails(
            [
                entry({ id: 'e1', from: null }),
                entry({
                    id: 'e2',
                    kind: 'rest',
                    from: null,
                    to: { x: 0.5005, y: 0.5 },
                    at: '2026-01-01T11:00:00.000Z',
                }),
            ],
            1
        );

        expect(trail.nodes).toHaveLength(1);
        expect(trail.nodes[0].entryId).toBe('e1');
    });

    it('accounts for aspect when merging', () => {
        const entries = [
            entry({ id: 'e1', from: null }),
            entry({
                id: 'e2',
                from: null,
                to: { x: 0.5, y: 0.503 },
                at: '2026-01-01T11:00:00.000Z',
            }),
        ];

        expect(buildTrails(entries, 1)[0].nodes).toHaveLength(2);
        expect(buildTrails(entries, 4)[0].nodes).toHaveLength(1);
    });

    it('orders by time regardless of input order', () => {
        const [trail] = buildTrails(
            [
                entry({
                    id: 'late',
                    from: null,
                    to: { x: 0.9, y: 0.9 },
                    at: '2026-01-01T12:00:00.000Z',
                }),
                entry({ id: 'early', from: null }),
            ],
            1
        );

        expect(trail.nodes.map((n) => n.entryId)).toEqual(['early', 'late']);
    });

    it('groups by session, null included, ordered by first entry', () => {
        const trails = buildTrails(
            [
                entry({
                    id: 'a',
                    sessionId: null,
                    at: '2026-01-01T09:00:00.000Z',
                }),
                entry({
                    id: 'b',
                    sessionId: 's2',
                    at: '2026-01-01T10:00:00.000Z',
                }),
                entry({
                    id: 'c',
                    sessionId: null,
                    to: { x: 0.8, y: 0.8 },
                    at: '2026-01-01T11:00:00.000Z',
                }),
            ],
            1
        );

        expect(trails.map((t) => t.sessionId)).toEqual([null, 's2']);
        expect(trails[0].nodes).toHaveLength(2);
    });

    it('returns no trails for no entries', () => {
        expect(buildTrails([], 1)).toEqual([]);
    });
});

const row = (over: Partial<TrailRow> = {}): TrailRow => ({
    id: 'r1',
    sessionId: 's1',
    kind: 'travel',
    characterIds: ['h1'],
    names: new Map([
        ['h1', 'Aria'],
        ['h2', 'Borin'],
    ]),
    from: { x: 0.1, y: 0.1 },
    to: { x: 0.5, y: 0.5 },
    createdAt: new Date('2026-01-01T10:00:00.000Z'),
    ...over,
});

describe('filterTrailForViewer', () => {
    it('keeps a fully own entry intact', () => {
        const [e] = filterTrailForViewer([row()], new Set(['h1']));

        expect(e).toEqual({
            id: 'r1',
            sessionId: 's1',
            kind: 'travel',
            heroes: [{ id: 'h1', name: 'Aria' }],
            from: { x: 0.1, y: 0.1 },
            to: { x: 0.5, y: 0.5 },
            at: '2026-01-01T10:00:00.000Z',
        });
    });

    it('hides from and foreign heroes in a mixed entry', () => {
        const [e] = filterTrailForViewer(
            [row({ characterIds: ['h1', 'h2'] })],
            new Set(['h1'])
        );

        expect(e.from).toBeNull();
        expect(e.heroes).toEqual([{ id: 'h1', name: 'Aria' }]);
    });

    it('drops an entry with no own heroes', () => {
        expect(
            filterTrailForViewer(
                [row({ characterIds: ['h2'] })],
                new Set(['h1'])
            )
        ).toEqual([]);
    });
});
