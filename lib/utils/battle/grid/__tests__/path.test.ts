import { describe, expect, it } from 'vitest';

import { canStand } from '../occupancy';
import {
    moveBudget,
    movementBudget,
    pathTo,
    reachable,
    remainingMovement,
} from '../path';

import { CombatStatus, ParticipantSide } from '@/lib/constants/battle';
import { MAP_LIMITS } from '@/lib/constants/map-limits';
import { makeEffect } from '@/lib/utils/abilities/__tests__/fixtures';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig, GridPoint } from '@/types/battle-grid';

const map: BattleMapConfig = {
    cols: 6,
    rows: 3,
    background: null,
    opacity: 0.3,
};

function at(
    id: string,
    position: GridPoint,
    side: string = ParticipantSide.ALLY,
    extra: Partial<BattleParticipant['combatStats']> = {}
): BattleParticipant {
    const p = createMockParticipant();

    return {
        ...p,
        basicInfo: {
            ...p.basicInfo,
            id,
            side: side as BattleParticipant['basicInfo']['side'],
        },
        combatStats: { ...p.combatStats, speed: 30, ...extra },
        battleData: { ...p.battleData, position },
    };
}

describe('рух по сітці', () => {
    it('бюджет = speed / 5 мінус пройдене', () => {
        const hero = at('h', { x: 0, y: 0 });

        expect(movementBudget(hero, DEFAULT_RULES)).toBe(6);
        expect(
            remainingMovement(
                {
                    ...hero,
                    battleData: { ...hero.battleData, movementUsed: 4 },
                },
                DEFAULT_RULES
            )
        ).toBe(2);
    });

    it('ворожа стіна блокує, союзник прохідний, але стати на нього не можна', () => {
        const hero = at('h', { x: 0, y: 1 });

        const wall = [0, 1, 2].map((y) =>
            at(`e${y}`, { x: 2, y }, ParticipantSide.ENEMY)
        );

        const reach = reachable(map, [hero, ...wall], hero, 6);

        expect(reach.has('3:1')).toBe(false);

        const ally = at('a', { x: 1, y: 1 });

        const reach2 = reachable(map, [hero, ally], hero, 6);

        expect(reach2.get('2:1')).toBe(2);
        expect(reach2.has('1:1')).toBe(false);
    });

    it('мертвий ворог не блокує', () => {
        const hero = at('h', { x: 0, y: 1 });

        const dead = at('d', { x: 1, y: 1 }, ParticipantSide.ENEMY, {
            status: CombatStatus.DEAD,
            currentHp: 0,
        });

        expect(canStand(map, [hero, dead], hero, { x: 1, y: 1 })).toBe(true);
    });

    it('2×2 не виходить за край і не стає на чужу клітинку', () => {
        const ogre = at('o', { x: 0, y: 0 }, ParticipantSide.ENEMY, {
            gridSize: 2,
        });

        expect(canStand(map, [ogre], ogre, { x: 5, y: 0 })).toBe(false);
        expect(canStand(map, [ogre], ogre, { x: 4, y: 1 })).toBe(true);

        const hero = at('h', { x: 3, y: 1 });

        expect(canStand(map, [ogre, hero], ogre, { x: 2, y: 0 })).toBe(false);
    });

    it('immobilized — бюджет 0', () => {
        const hero = at('h', { x: 0, y: 0 });

        const rooted: BattleParticipant = {
            ...hero,
            battleData: {
                ...hero.battleData,
                activeEffects: [
                    makeEffect('r', {
                        name: 'Коріння',
                        type: 'condition',
                        duration: 1,
                        effects: [{ type: 'immobilized', value: 0 }],
                    }),
                ],
            },
        };

        expect(movementBudget(rooted, DEFAULT_RULES)).toBe(0);
    });

    it('2×2: власні клітинки не блокують і не зникають з позначок руху', () => {
        const ogre = at('o', { x: 1, y: 0 }, ParticipantSide.ALLY, {
            gridSize: 2,
            speed: 30,
        });

        const marks = reachable(map, [ogre], ogre, 1);

        expect(marks.get('2:0')).toBe(1);
        expect(marks.get('1:1')).toBe(1);
        expect(marks.get('0:0')).toBe(1);
        expect(marks.has('1:0')).toBe(false);
    });
});

describe('moveBudget', () => {
    const unit = at('g', { x: 0, y: 0 });

    const dm = (cols: number, rows: number) =>
        moveBudget(
            {
                map: { ...map, cols, rows },
                dmUserId: 'dm-user',
                rules: DEFAULT_RULES,
            },
            { ...unit, basicInfo: { ...unit.basicInfo, controlledBy: 'dm' } }
        );

    it('ДМ: min(cols*rows, dmMoveCap)', () => {
        expect(dm(100, 100)).toBe(MAP_LIMITS.dmMoveCap);
        expect(MAP_LIMITS.dmMoveCap).toBe(60);
        expect(dm(5, 5)).toBe(25);
    });

    it('гравець — залишок швидкості', () => {
        expect(
            moveBudget(
                { map, dmUserId: null, rules: DEFAULT_RULES },
                at('h', { x: 0, y: 0 })
            )
        ).toBe(6);
    });
});

describe('вибір маршруту', () => {
    const wide: BattleMapConfig = { ...map, cols: 12, rows: 9 };

    it('при рівній вартості йде прямо, а не діагональним трикутником', () => {
        const hero = at('h', { x: 0, y: 4 });

        const path = pathTo(wide, [hero], hero, { x: 6, y: 4 }, 6) ?? [];

        expect(path).toHaveLength(6);
        expect(path.every((c) => c.y === 4)).toBe(true);
    });

    it('при зсуві по обох осях діагональ не робить гак', () => {
        const hero = at('h', { x: 0, y: 4 });

        const path = pathTo(wide, [hero], hero, { x: 6, y: 6 }, 6) ?? [];

        expect(path).toHaveLength(6);
        expect(Math.max(...path.map((c) => c.y))).toBe(6);
        expect(path.map((c) => c.y)).toEqual(
            [...path.map((c) => c.y)].sort((a, b) => a - b)
        );
    });

    it('обходить союзника, якщо обхід коштує стільки ж, і проходить крізь нього, коли інакше не можна', () => {
        const hero = at('h', { x: 0, y: 4 });

        const ally = at('a', { x: 3, y: 4 });

        const around = pathTo(wide, [hero, ally], hero, { x: 6, y: 4 }, 6) ?? [];

        expect(around).toHaveLength(6);
        expect(around.some((c) => c.x === 3 && c.y === 4)).toBe(false);

        const corridor: BattleMapConfig = {
            ...map,
            cols: 5,
            rows: 1,
        };

        const blocked = at('a', { x: 2, y: 0 });

        const straight = at('h', { x: 0, y: 0 });

        expect(
            pathTo(corridor, [straight, blocked], straight, { x: 4, y: 0 }, 6)
        ).toHaveLength(4);
    });

    it('на hex теж найкоротший по прямій серед рівних', () => {
        const hex: BattleMapConfig = { ...wide, gridType: 'hex' };

        const hero = at('h', { x: 0, y: 4 });

        const path = pathTo(hex, [hero], hero, { x: 6, y: 4 }, 6) ?? [];

        expect(path).toHaveLength(6);
        expect(path.every((c) => Math.abs(c.y - 4) <= 1)).toBe(true);
    });
});
