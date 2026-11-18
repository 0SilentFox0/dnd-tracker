import { describe, expect, it } from 'vitest';

import { isAdjacentOnMap } from '../adjacency';
import { isAdjacentAttack } from '../adjacent-attack';
import { attackReachError } from '../attack-reach';

import { AttackType, ParticipantSide } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import { placed, testMap } from '@/lib/utils/battle/__tests__/fixtures/placed';
import { REJECT } from '@/lib/utils/battle/store/reject';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { BattleAttack } from '@/types/battle';
import type { GridPoint } from '@/types/battle-grid';

const unit = (id: string, at: GridPoint, side: ParticipantSide, size = 1) =>
    placed(id, { side, at, hp: 20, size });

const sword = {
    id: 's',
    name: 'Sword',
    type: AttackType.MELEE,
} as BattleAttack;

const hero = unit('h', { x: 2, y: 2 }, ParticipantSide.ALLY);

const foe = unit('f', { x: 3, y: 2 }, ParticipantSide.ENEMY);

const reach = (map: ReturnType<typeof testMap>) =>
    attackReachError(map, [hero, foe], hero, sword, [foe], DEFAULT_RULES);

describe('сусідство й досяг зі стінами', () => {
    it('стіна між сусідами ріже ближній бій', () => {
        const map = testMap(6, 6, { walls: ['2:2:e'] });

        expect(isAdjacentOnMap(map, hero, foe)).toBe(false);
        expect(reach(map)).toEqual(textRef(REJECT.targetNotNear));
    });

    it('ґрати удару не заважають', () => {
        const map = testMap(6, 6, { bars: ['2:2:e'] });

        expect(isAdjacentOnMap(map, hero, foe)).toBe(true);
        expect(reach(map)).toBeNull();
    });

    it('без стін і без карти нічого не змінюється', () => {
        expect(isAdjacentOnMap(testMap(6, 6), hero, foe)).toBe(true);
        expect(isAdjacentOnMap(undefined, hero, foe)).toBe(true);
        expect(reach(testMap(6, 6))).toBeNull();
    });

    it('діагональ через закритий кут не суміжна', () => {
        const diag = unit('d', { x: 3, y: 3 }, ParticipantSide.ENEMY);

        const map = testMap(6, 6, { walls: ['2:2:s'] });

        expect(isAdjacentOnMap(map, hero, diag)).toBe(false);
        expect(isAdjacentOnMap(testMap(6, 6), hero, diag)).toBe(true);
    });

    it('великий учасник суміжний, якщо хоч одна пара клітинок без стіни', () => {
        const big = unit('b', { x: 3, y: 1 }, ParticipantSide.ENEMY, 2);

        const map = testMap(6, 6, { walls: ['2:1:e'] });

        expect(isAdjacentOnMap(map, hero, big)).toBe(true);
    });

    it('isAdjacentAttack з картою: стіна — не суміжна атака', () => {
        const map = testMap(6, 6, { walls: ['2:2:e'] });

        expect(isAdjacentAttack(hero, foe, sword, map)).toBe(false);
        expect(isAdjacentAttack(hero, foe, sword, testMap(6, 6))).toBe(true);
    });
});

describe('дальня атака зі стінами', () => {
    const bow = {
        id: 'b',
        name: 'Bow',
        type: AttackType.RANGED,
        range: '80/320',
    } as BattleAttack;

    const archer = unit('a', { x: 0, y: 5 }, ParticipantSide.ALLY);

    const far = unit('t', { x: 6, y: 5 }, ParticipantSide.ENEMY);

    const shoot = (map: ReturnType<typeof testMap>) =>
        attackReachError(map, [archer, far], archer, bow, [far], DEFAULT_RULES);

    it('стіна на лінії забороняє постріл', () => {
        expect(shoot(testMap(10, 10, { walls: ['3:5:e'] }))).toEqual(
            textRef(REJECT.targetBehindWall)
        );
    });

    it('ґрати й вільна лінія не заважають', () => {
        expect(shoot(testMap(10, 10, { bars: ['3:5:e'] }))).toBeNull();
        expect(shoot(testMap(10, 10))).toBeNull();
    });

    it('стіна поза лінією не заважає', () => {
        expect(shoot(testMap(10, 10, { walls: ['3:2:e'] }))).toBeNull();
    });
});
