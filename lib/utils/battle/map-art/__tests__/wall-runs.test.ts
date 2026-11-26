import { describe, expect, it } from 'vitest';

import { wallRuns } from '../wall-runs';

import { edgesOfCell } from '@/lib/utils/battle/grid/edge-keys';
import { hexVertices } from '@/lib/utils/battle/grid/hex';
import type { MapArtOpening } from '@/types/battle-map';

const walls = (keys: string[], material = 'stone') =>
    Object.fromEntries(keys.map((k) => [k, material]));

const kinds = (joints: { kind: string }[]) => joints.map((j) => j.kind).sort();

describe('wallRuns on square', () => {
    it('makes one run with a corner for an L', () => {
        const { runs, joints } = wallRuns(
            { walls: walls(['1:1:e', '1:1:s']), openings: {} },
            'square'
        );

        expect(runs).toHaveLength(1);
        expect(kinds(joints)).toEqual(['corner', 'end', 'end']);
    });

    it('splits a T into three runs with one tee', () => {
        const { runs, joints } = wallRuns(
            { walls: walls(['1:0:e', '1:1:e', '1:0:s']), openings: {} },
            'square'
        );

        expect(runs).toHaveLength(3);
        expect(joints.filter((j) => j.kind === 'tee')).toHaveLength(1);
    });

    it('merges collinear edges into a two-point run', () => {
        const { runs } = wallRuns(
            { walls: walls(['0:1:s', '1:1:s', '2:1:s']), openings: {} },
            'square'
        );

        expect(runs).toHaveLength(1);
        expect(runs[0].points).toHaveLength(2);
    });

    it('breaks a wall at a door and marks jambs', () => {
        const openings: Record<string, MapArtOpening> = {
            '1:1:s': { kind: 'door', material: 'wood' },
        };

        const { runs, joints } = wallRuns(
            { walls: walls(['0:1:s', '1:1:s', '2:1:s']), openings },
            'square'
        );

        expect(runs).toHaveLength(2);
        expect(joints.filter((j) => j.kind === 'jamb')).toHaveLength(2);
    });

    it('breaks at a material change with a corner joint', () => {
        const { runs, joints } = wallRuns(
            {
                walls: { '0:1:s': 'stone', '1:1:s': 'brick' },
                openings: {},
            },
            'square'
        );

        expect(runs.map((r) => r.material).sort()).toEqual(['brick', 'stone']);
        expect(joints.filter((j) => j.kind === 'corner')).toHaveLength(1);
    });
});

describe('wallRuns on hex', () => {
    it('closes a ring around a cell', () => {
        const keys = edgesOfCell('hex', { x: 3, y: 3 });

        const { runs, joints } = wallRuns({ walls: walls(keys), openings: {} }, 'hex');

        expect(runs).toHaveLength(1);
        expect(runs[0].closed).toBe(true);
        expect(joints.filter((j) => j.kind === 'corner')).toHaveLength(6);

        const expected = hexVertices({ x: 3, y: 3 });

        for (const v of expected)
            expect(
                runs[0].points.some(
                    (p) => Math.abs(p.x - v.x) < 1e-6 && Math.abs(p.y - v.y) < 1e-6
                )
            ).toBe(true);
        expect(runs[0].points).toHaveLength(6);
    });
});
