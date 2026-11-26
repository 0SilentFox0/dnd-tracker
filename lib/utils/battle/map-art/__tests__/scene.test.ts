import { describe, expect, it } from 'vitest';

import { decodeFloors, encodeFloors } from '../floors';
import { clipScene, emptyScene } from '../scene';

describe('clipScene', () => {
    const map = { cols: 10, rows: 10 };

    it('drops everything outside the map', () => {
        const chunks = {
            '0:0': new Uint16Array(256).fill(3),
            '1:0': new Uint16Array(256).fill(3),
        };

        const scene = {
            ...emptyScene(),
            floors: encodeFloors(chunks),
            walls: { '15:3:e': 'stone', '2:2:e': 'stone' },
            openings: {
                '15:3:e': { kind: 'door' as const, material: 'wood' },
                '2:2:e': { kind: 'door' as const, material: 'wood' },
            },
            blocked: { '12:12': null, '3:3': null },
            lights: [
                { id: 'a', x: 1500, y: 100, radius: 3, color: '#ffffff', intensity: 1 },
                { id: 'b', x: 100, y: 100, radius: 3, color: '#ffffff', intensity: 1 },
            ],
        };

        const out = clipScene(scene, map);

        expect(Object.keys(out.walls)).toEqual(['2:2:e']);
        expect(Object.keys(out.openings)).toEqual(['2:2:e']);
        expect(Object.keys(out.blocked)).toEqual(['3:3']);
        expect(out.lights.map((l) => l.id)).toEqual(['b']);
        expect(Object.keys(out.floors)).toEqual(['0:0']);

        const cells = decodeFloors(out.floors)['0:0'];

        expect(cells[9]).toBe(3);
        expect(cells[10]).toBe(0);
        expect(cells[10 * 16]).toBe(0);
    });

    it('drops an opening whose wall is gone', () => {
        const scene = {
            ...emptyScene(),
            openings: { '1:1:e': { kind: 'door' as const, material: 'wood' } },
        };

        expect(clipScene(scene, map).openings).toEqual({});
    });

    it('returns the same reference when nothing is clipped', () => {
        const scene = {
            ...emptyScene(),
            walls: { '2:2:e': 'stone' },
            blocked: { '3:3': null },
        };

        expect(clipScene(scene, map)).toBe(scene);
    });
});
