import { describe, expect, it } from 'vitest';

import { isAdjacentOnMap } from '../adjacency';
import { canonicalEdge, edgesOfCell } from '../edge-keys';
import { reachable } from '../path';
import { pushAway } from '../push';
import { wallsAllowSight } from '../sight';
import { rayCells } from '../template';

import { ParticipantSide } from '@/lib/constants/battle';
import { placed, testMap } from '@/lib/utils/battle/__tests__/fixtures/placed';
import { floodRoom } from '@/lib/utils/battle/fog/reveal';
import { visibleFrom } from '@/lib/utils/battle/vision/shadowcast';

const at = (x: number, y: number) => ({ x, y });

const wall = canonicalEdge('hex', at(3, 3), 'n');

const hexMap = (extra = {}) => testMap(7, 7, { gridType: 'hex', ...extra });

const hero = placed('h', { side: ParticipantSide.ALLY, at: at(3, 3) });

describe('hex walls in mechanics', () => {
    it('reachable detours around a wall', () => {
        const free = reachable(hexMap(), [hero], hero, 10);

        const walled = reachable(hexMap({ walls: [wall] }), [hero], hero, 10);

        expect(free.get('3:2')).toBe(1);
        expect(walled.get('3:2')).toBe(2);
    });

    it('wall blocks sight', () => {
        const viewer = placed('v', { side: ParticipantSide.ALLY, at: at(3, 4) });

        const enemy = placed('e', { at: at(3, 1) });

        expect(wallsAllowSight(hexMap(), viewer, enemy)).toBe(true);
        expect(wallsAllowSight(hexMap({ walls: [wall] }), viewer, enemy)).toBe(false);
    });

    it('wall breaks adjacency', () => {
        const a = placed('a', { at: at(3, 3) });

        const b = placed('b', { at: at(3, 2) });

        expect(isAdjacentOnMap(hexMap(), a, b)).toBe(true);
        expect(isAdjacentOnMap(hexMap({ walls: [wall] }), a, b)).toBe(false);
    });

    it('ray stops before the wall', () => {
        const free = rayCells(hexMap(), at(3, 4), at(3, 0), { maxCells: 4 });

        const cut = rayCells(hexMap({ walls: [wall] }), at(3, 4), at(3, 0), { maxCells: 4 });

        expect(cut.length).toBeLessThan(free.length);
        expect(cut.some((c) => c.y < 3)).toBe(false);
    });

    it('shadowcast does not see past the wall', () => {
        expect(visibleFrom(hexMap(), at(3, 4), 5).has('3:1')).toBe(true);
        expect(visibleFrom(hexMap({ walls: [wall] }), at(3, 4), 5).has('3:1')).toBe(false);
    });

    it('closed door detours, open door is free', () => {
        const closed = reachable(hexMap({ doors: { [wall]: { open: false } } }), [hero], hero, 10);

        const open = reachable(hexMap({ doors: { [wall]: { open: true } } }), [hero], hero, 10);

        expect(closed.get('3:2')).toBe(2);
        expect(open.get('3:2')).toBe(1);
    });

    it('floodRoom stays inside a ring of walls', () => {
        const ring = edgesOfCell('hex', at(3, 3));

        const room = floodRoom({ map: hexMap({ walls: ring }), start: at(3, 3) });

        expect([...room]).toEqual(['3:3']);
    });

    it('pushAway is stopped by a hex wall', () => {
        const target = placed('t', { at: at(3, 3) });

        expect(pushAway(hexMap({ walls: [wall] }), [target], at(3, 4), target, 1).steps).toBe(0);
        expect(pushAway(hexMap(), [target], at(3, 4), target, 1).steps).toBe(1);
    });

    it('pushAway is stopped by a square wall', () => {
        const target = placed('t', { at: at(2, 2) });

        const map = testMap(5, 5, { walls: ['2:2:e'] });

        expect(pushAway(map, [target], at(1, 2), target, 1).steps).toBe(0);
        expect(pushAway(testMap(5, 5), [target], at(1, 2), target, 1).steps).toBe(1);
    });
});
