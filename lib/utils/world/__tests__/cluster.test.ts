import { describe, expect, it } from 'vitest';

import { clusterByPixel, clusterCenter, clusterZoom } from '../cluster';

interface Item {
    id: string;
    x: number;
    y: number;
}

const item = (id: string, x: number, y = 0): Item => ({ id, x, y });

const run = (items: Item[], threshold = 24, zoom = 1) =>
    clusterByPixel(items, {
        key: (i) => i.id,
        point: (i) => ({ x: i.x, y: i.y }),
        px: (i) => ({ x: i.x * zoom, y: i.y * zoom }),
        threshold,
    });

const view = {
    zoom: 1,
    box: { width: 1000, height: 1000 },
    threshold: 28,
    maxZoom: 8,
};

describe('clusterByPixel', () => {
    it('joins items closer than the threshold and splits at it', () => {
        expect(run([item('a', 0), item('b', 23.9)])).toHaveLength(1);
        expect(run([item('a', 0), item('b', 24)])).toHaveLength(2);
    });

    it('measures in screen pixels: zoom separates the same items', () => {
        const items = [item('a', 0), item('b', 10)];

        expect(run(items, 24, 1)).toHaveLength(1);
        expect(run(items, 24, 3)).toHaveLength(2);
    });

    it('the first item in input order is the anchor and the cluster key', () => {
        const [g] = run([item('b', 5, 1), item('a', 0, 2)]);

        expect(g.key).toBe('b');
        expect(g.point).toEqual({ x: 5, y: 1 });
        expect(g.items.map((i) => i.id)).toEqual(['b', 'a']);
    });

    it('is greedy: a far third item does not chain through the second', () => {
        const groups = run([item('a', 0), item('b', 20), item('c', 40)]);

        expect(groups.map((g) => g.items.map((i) => i.id))).toEqual([
            ['a', 'b'],
            ['c'],
        ]);
    });

    it('is deterministic: same input gives same groups and order', () => {
        const items = [item('a', 0), item('b', 10), item('c', 100)];

        expect(run(items)).toEqual(run(items));
    });
});

describe('clusterZoom', () => {
    it('returns a zoom that splits the closest pair, clamped to maxZoom', () => {
        const near = [
            { x: 0.5, y: 0.5 },
            { x: 0.51, y: 0.5 },
        ];

        const z = clusterZoom(near, view);

        expect(z).toBeCloseTo((28 / 10) * 1.15);

        const tight = [
            { x: 0.5, y: 0.5 },
            { x: 0.5001, y: 0.5 },
        ];

        expect(clusterZoom(tight, view)).toBe(8);
    });

    it('never returns less than zoom × 1.5', () => {
        const far = [
            { x: 0, y: 0 },
            { x: 0.027, y: 0 },
        ];

        expect(clusterZoom(far, { ...view, zoom: 2 })).toBe(3);
    });

    it('returns null at max zoom', () => {
        expect(
            clusterZoom(
                [
                    { x: 0, y: 0 },
                    { x: 0.01, y: 0 },
                ],
                { ...view, zoom: 8 }
            )
        ).toBeNull();
    });

    it('returns null for duplicates in one point', () => {
        expect(
            clusterZoom(
                [
                    { x: 0.3, y: 0.3 },
                    { x: 0.3, y: 0.3 },
                ],
                view
            )
        ).toBeNull();
    });
});

describe('clusterCenter', () => {
    it('is the centre of the bounding box', () => {
        expect(
            clusterCenter([
                { x: 0.1, y: 0.2 },
                { x: 0.5, y: 0.2 },
                { x: 0.3, y: 0.6 },
            ])
        ).toEqual({ x: 0.3, y: 0.4 });
    });
});
