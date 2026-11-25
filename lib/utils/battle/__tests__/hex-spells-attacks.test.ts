import { describe, expect, it } from 'vitest';

import { cleaveTargets } from '../attack/process/cleave';
import { fireWaveVictims } from '../attack/process/fire-wave';
import { piercingTargets } from '../attack/process/piercing';
import { spellTargetInRange } from '../flows/spell-pick';
import { adjacentFreeCell } from '../spell/cast/move-self';
import { spellChain } from '../spell/spell-targeting';
import { placed, testMap } from './fixtures/placed';

import { ParticipantSide } from '@/lib/constants/battle';
import { AURA_RADIUS_CELLS } from '@/lib/constants/battle';
import {
    makeParticipant,
    resolved,
} from '@/lib/utils/abilities/__tests__/fixtures';
import { syncMapAuras } from '@/lib/utils/abilities/engine/effects/map-auras';
import { cellDistance } from '@/lib/utils/battle/grid/geometry';
import {
    fromCube,
    hexNeighbors,
    hexRing,
    toCube,
} from '@/lib/utils/battle/grid/hex';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { BattleParticipant } from '@/types/battle';
import type { GridPoint } from '@/types/battle-grid';

const HEX = testMap(12, 12, { gridType: 'hex' });

const SQUARE = testMap(12, 12);

const A: GridPoint = { x: 4, y: 4 };

const cheb = (a: GridPoint, b: GridPoint) =>
    Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

const diagOf = (radius: number) =>
    hexRing(A, radius).find((c) => cheb(c, A) < radius) as GridPoint;

const step = (from: GridPoint, dir: number, n: number): GridPoint => {
    const c = toCube(from);

    const d = [
        { x: 1, y: -1, z: 0 },
        { x: 1, y: 0, z: -1 },
        { x: 0, y: 1, z: -1 },
        { x: -1, y: 1, z: 0 },
        { x: -1, y: 0, z: 1 },
        { x: 0, y: -1, z: 1 },
    ][dir];

    return fromCube({ x: c.x + d.x * n, y: c.y + d.y * n, z: c.z + d.z * n });
};

const at = (
    id: string,
    pos: GridPoint,
    side: ParticipantSide = ParticipantSide.ENEMY
) => placed(id, { side, at: pos, hp: 50 });

const ally = (id: string, pos: GridPoint) => at(id, pos, ParticipantSide.ALLY);

const ids = (ps: { basicInfo: { id: string } }[]) =>
    ps.map((p) => p.basicInfo.id);

describe('hex: spell targeting', () => {
    it('range counts hex steps, not Chebyshev', () => {
        const caster = ally('c', A);

        const target = at('t', diagOf(2));

        expect(cellDistance(A, target.battleData.position as GridPoint, 'hex')).toBe(2);
        expect(
            spellTargetInRange(SQUARE, caster, target, 5, DEFAULT_RULES)
        ).toBe(true);
        expect(
            spellTargetInRange(HEX, caster, target, 5, DEFAULT_RULES)
        ).toBe(false);
        expect(
            spellTargetInRange(HEX, caster, target, 10, DEFAULT_RULES)
        ).toBe(true);
    });

    it('chain jumps to the hex-nearest target', () => {
        const caster = ally('c', { x: 0, y: 0 });

        const first = at('f', A);

        const far = at('far', diagOf(2));

        const near = at('near', hexNeighbors(A)[0]);

        const scene = { participants: [caster, first, far, near], caster };

        const chain = { side: 'enemy' as const, maxTargets: 2 };

        expect(ids(spellChain(scene, chain, first, SQUARE))).toEqual([
            'f',
            'far',
        ]);
        expect(ids(spellChain(scene, chain, first, HEX))).toEqual([
            'f',
            'near',
        ]);
    });
});

describe('hex: attacks', () => {
    it('cleave hits only enemies adjacent to the attacker next to the primary', () => {
        const c = ally('c', A);

        const ring = hexNeighbors(A);

        const primary = at('p', ring[0]);

        const beside = at(
            'beside',
            ring.find(
                (r) =>
                    r !== ring[0] &&
                    cellDistance(r, ring[0], 'hex') === 1
            ) as GridPoint
        );

        const opposite = at('opp', ring[3]);

        const out = at('out', diagOf(2));

        const order = [c, primary, beside, opposite, out];

        expect(ids(cleaveTargets(HEX, order, c, primary, 2))).toEqual([
            'beside',
        ]);
    });

    it('piercing follows the hex line and skips off-line enemies', () => {
        const a = ally('a', A);

        const ps = [
            a,
            at('t', step(A, 1, 1)),
            at('mid', step(A, 1, 3)),
            at('side', step(A, 3, 2)),
        ];

        expect(piercingTargets(HEX, ps, a, 't')).toEqual(['t', 'mid']);
    });

    it('fire wave pushes along a real hex direction', () => {
        const a = ally('a', A);

        const ps = [
            a,
            at('v', step(A, 2, 2)),
            at('behind', step(A, 2, 3)),
            at('back', step(A, 5, 2)),
        ];

        const hit = fireWaveVictims(HEX, ps, a, 'v', 15, DEFAULT_RULES);

        expect(hit).toContain('behind');
        expect(hit).not.toContain('back');
    });
});

describe('hex: map auras', () => {
    const fear = resolved(
        {
            trigger: { event: 'passive' },
            effects: [
                {
                    kind: 'modifyStat',
                    stat: 'armor',
                    flat: -2,
                    target: 'nearbyEnemies',
                },
            ],
        },
        { id: 'unit-fear-aura' }
    );

    const withPos = (p: BattleParticipant, position: GridPoint) => ({
        ...p,
        battleData: { ...p.battleData, position },
    });

    const owner = withPos(
        makeParticipant({
            id: 'n',
            side: ParticipantSide.ENEMY,
            abilities: [fear],
        }),
        A
    );

    const mark = (map: typeof HEX) => {
        const foe = withPos(makeParticipant({ id: 'h' }), diagOf(AURA_RADIUS_CELLS + 1));

        return syncMapAuras([owner, foe], map)[1].battleData.activeEffects
            .length;
    };

    it('radius is hex distance', () => {
        const foe = diagOf(AURA_RADIUS_CELLS + 1);

        expect(cheb(foe, A)).toBeLessThanOrEqual(AURA_RADIUS_CELLS);
        expect(mark(SQUARE)).toBeGreaterThan(0);
        expect(mark(HEX)).toBe(0);
    });
});

describe('hex: move-self', () => {
    it('lands on a cell at hex distance 1 from the target', () => {
        const mover = ally('m', { x: 9, y: 9 });

        const target = at('t', A);

        const cell = adjacentFreeCell(HEX, [mover, target], mover, target);

        expect(cell).not.toBeNull();
        expect(cellDistance(cell as GridPoint, A, 'hex')).toBe(1);
    });
});
