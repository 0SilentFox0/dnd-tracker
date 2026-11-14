import { describe, expect, it } from 'vitest';

import { lineOfFire } from '../line-of-fire';
import { wallsAllowSight } from '../sight';

import { ParticipantSide } from '@/lib/constants/battle';
import { placed, testMap } from '@/lib/utils/battle/__tests__/fixtures/placed';
import type { GridPoint } from '@/types/battle';

const at = (id: string, pos: GridPoint, side: ParticipantSide) =>
    placed(id, { side, at: pos, hp: 20 });

const shooter = at('s', { x: 0, y: 5 }, ParticipantSide.ALLY);

const target = at('t', { x: 6, y: 5 }, ParticipantSide.ENEMY);

const fire = (extra: Parameters<typeof testMap>[2]) =>
    lineOfFire(testMap(10, 10, extra), [shooter, target], shooter, target);

describe('lineOfFire: стіни й ґрати', () => {
    it('стіна на лінії — wallBlocked, а не укриття', () => {
        expect(fire({ walls: ['3:5:e'] })).toEqual({
            blocked: false,
            wallBlocked: true,
            cells: [],
        });
    });

    it('стіна поза лінією не заважає', () => {
        expect(fire({ walls: ['3:2:e'] }).wallBlocked).toBe(false);
    });

    it('ґрати не блокують вогонь', () => {
        expect(fire({ bars: ['3:5:e'] })).toMatchObject({
            blocked: false,
            wallBlocked: false,
        });
    });
});

describe('wallsAllowSight', () => {
    it('стіна ріже видимість, ґрати — ні', () => {
        const walled = testMap(10, 10, { walls: ['3:5:e'] });

        const barred = testMap(10, 10, { bars: ['3:5:e'] });

        expect(wallsAllowSight(walled, shooter, target)).toBe(false);
        expect(wallsAllowSight(barred, shooter, target)).toBe(true);
        expect(wallsAllowSight(testMap(), shooter, target)).toBe(true);
    });
});
