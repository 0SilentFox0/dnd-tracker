import { describe, expect, it } from 'vitest';

import { edgeBlocks, wallsOf } from '../edges';
import { cellKey } from '../geometry';
import { searchPaths } from '../path';

import { ParticipantSide } from '@/lib/constants/battle';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { mazeMap } from '@/lib/utils/battle/modes/maze/__tests__/fixtures';
import { canStep, wallSet } from '@/lib/utils/battle/modes/maze/walls';
import type { GridPoint } from '@/types/battle';

// Server maze moves go through mazeMove/canStep; the client preview uses the generic grid path, so the two must agree.
const COLS = 4;

const ROWS = 3;

const walls = ['0:0:e', '1:1:s', '2:0:e', '2:1:e', '2:2:e'];

const map = mazeMap({ walls }, COLS, ROWS);

const orthogonal = (a: GridPoint): GridPoint[] =>
    [
        { x: a.x + 1, y: a.y },
        { x: a.x, y: a.y + 1 },
    ].filter((b) => b.x < COLS && b.y < ROWS);

describe('maze walls vs generic grid', () => {
    it('wallsOf(map) equals the maze walls', () => {
        expect([...wallsOf(map)].sort()).toEqual(
            [...wallSet({ walls })].sort()
        );
    });

    it("edgeBlocks 'move' agrees with canStep on every orthogonal step", () => {
        const grid = { cols: COLS, rows: ROWS };

        const set = wallSet({ walls });

        for (let x = 0; x < COLS; x++)
            for (let y = 0; y < ROWS; y++)
                for (const b of orthogonal({ x, y })) {
                    const a = { x, y };

                    expect(edgeBlocks(map, a, b, 'move')).toBe(
                        !canStep(grid, set, a, b)
                    );
                    expect(edgeBlocks(map, b, a, 'move')).toBe(
                        !canStep(grid, set, b, a)
                    );
                }
    });

    it('searchPaths does not cross a sealed column of walls', () => {
        const p = createMockParticipant();

        const hero = {
            ...p,
            basicInfo: { ...p.basicInfo, id: 'h', side: ParticipantSide.ALLY },
            battleData: { ...p.battleData, position: { x: 0, y: 0 } },
        };

        const { cost } = searchPaths(map, [hero], hero, 30);

        expect(cost.has(cellKey({ x: 2, y: 0 }))).toBe(true);
        expect(cost.has(cellKey({ x: 3, y: 0 }))).toBe(false);
        expect(cost.has(cellKey({ x: 3, y: 2 }))).toBe(false);
    });
});
