import { describe, expect, it } from 'vitest';

import { deriveMechanics } from '../derive';
import { emptyScene, sceneFromMap } from '../scene';

import type { MapArtScene } from '@/types/battle-map';

const scene = (patch: Partial<MapArtScene>): MapArtScene => ({
    ...emptyScene(),
    ...patch,
});

describe('deriveMechanics', () => {
    it('splits square walls into walls, doors and bars', () => {
        const s = scene({
            walls: { '1:1:e': 'stone', '2:1:e': 'stone', '3:1:e': 'stone', '4:1:s': 'stone' },
            openings: {
                '2:1:e': { kind: 'door', material: 'wood', locked: true, open: true },
                '3:1:e': { kind: 'window', material: 'glass' },
                '4:1:s': { kind: 'portcullis', material: 'bars-iron' },
            },
            blocked: { '5:5': null, '0:0': null },
        });

        expect(deriveMechanics(s, 'square')).toEqual({
            walls: ['1:1:e'],
            bars: ['3:1:e', '4:1:s'],
            doors: { '2:1:e': { open: true, locked: true } },
            blocked: ['0:0', '5:5'],
        });
    });

    it('defaults a door to closed and unlocked', () => {
        const s = scene({
            walls: { '1:1:e': 'stone' },
            openings: { '1:1:e': { kind: 'door', material: 'wood' } },
        });

        expect(deriveMechanics(s, 'square').doors).toEqual({ '1:1:e': { open: false } });
    });

    it('handles hex keys and drops keys of the other grid', () => {
        const s = scene({
            walls: { '1:1:n': 'stone', '2:2:ne': 'stone', '3:3:se': 'stone', '1:1:e': 'stone' },
            openings: { '2:2:ne': { kind: 'door', material: 'wood' } },
        });

        const d = deriveMechanics(s, 'hex');

        expect(d.walls).toEqual(['1:1:n', '3:3:se']);
        expect(Object.keys(d.doors)).toEqual(['2:2:ne']);
    });

    it('round-trips sceneFromMap on both grids', () => {
        const square = {
            walls: ['0:0:e', '1:1:s'],
            bars: ['2:2:e'],
            doors: { '3:3:s': { open: false, locked: true } },
            blocked: ['4:4'],
        };

        expect(deriveMechanics(sceneFromMap(square), 'square')).toEqual(square);

        const hex = {
            walls: ['1:1:n'],
            bars: ['2:2:ne'],
            doors: { '3:3:se': { open: true } },
            blocked: ['4:4'],
        };

        expect(deriveMechanics(sceneFromMap(hex), 'hex')).toEqual(hex);
    });
});
