import { describe, expect, it, vi } from 'vitest';

import { deriveMechanics } from '../derive';
import { emptyScene, sceneFromMap } from '../scene';

vi.mock('@/lib/constants/map-art/stamps', () => {
    const defs: Record<string, unknown> = {
        box: { id: 'box', cols: 1, rows: 1, blocks: { shape: 'rect', w: 1, h: 1 } },
        wall: {
            id: 'wall',
            cols: 1,
            rows: 1,
            sight: true,
            blocks: { shape: 'rect', w: 1, h: 1 },
        },
    };

    return { stampDef: (id: string) => defs[id], isStampId: (id: string) => id in defs };
});

import type { MapArtScene } from '@/types/battle-map';

const SQ = { cols: 10, rows: 10, gridType: 'square' as const };

const HEX = { cols: 10, rows: 10, gridType: 'hex' as const };

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

        expect(deriveMechanics(s, SQ)).toEqual({
            walls: ['1:1:e'],
            bars: ['3:1:e', '4:1:s'],
            doors: { '2:1:e': { open: true, locked: true } },
            blocked: ['0:0', '5:5'],
            sightBlocked: [],
        });
    });

    it('defaults a door to closed and unlocked', () => {
        const s = scene({
            walls: { '1:1:e': 'stone' },
            openings: { '1:1:e': { kind: 'door', material: 'wood' } },
        });

        expect(deriveMechanics(s, SQ).doors).toEqual({ '1:1:e': { open: false } });
    });

    it('handles hex keys and drops keys of the other grid', () => {
        const s = scene({
            walls: { '1:1:n': 'stone', '2:2:ne': 'stone', '3:3:se': 'stone', '1:1:e': 'stone' },
            openings: { '2:2:ne': { kind: 'door', material: 'wood' } },
        });

        const d = deriveMechanics(s, HEX);

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

        expect(deriveMechanics(sceneFromMap(square), SQ)).toEqual({
            ...square,
            sightBlocked: [],
        });

        const hex = {
            walls: ['1:1:n'],
            bars: ['2:2:ne'],
            doors: { '3:3:se': { open: true } },
            blocked: ['4:4'],
        };

        expect(deriveMechanics(sceneFromMap(hex), HEX)).toEqual({
            ...hex,
            sightBlocked: [],
        });
    });

    it('merges stamp cells with scene.blocked, sorted and deduplicated', () => {
        const stamp = (id: string, asset: string, x: number, y: number) => ({
            id,
            asset,
            x,
            y,
            rot: 0,
            scale: 1,
            flip: false,
            z: 0,
        });

        const s = scene({
            blocked: { '5:5': null, '0:0': null },
            stamps: [
                stamp('a', 'box', 550, 550),
                stamp('b', 'wall', 150, 250),
                stamp('c', 'box', 5050, 50),
            ],
        });

        const d = deriveMechanics(s, SQ);

        expect(d.blocked).toEqual(['0:0', '1:2', '5:5']);
        expect(d.sightBlocked).toEqual(['1:2']);
    });
});
