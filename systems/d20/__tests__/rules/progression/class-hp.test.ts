import { describe, expect, it } from 'vitest';

import { classHp } from '@/systems/d20/rules/progression/class-hp';
import type { GameClassData, ResolvedClassEntry } from '@/types/classes';

const cls = (over: Partial<GameClassData> = {}): GameClassData => ({
    id: 'c',
    name: 'Клас',
    icon: null,
    color: null,
    hitDie: 8,
    savingThrows: [],
    proficiencies: { armor: [], weapons: [], tools: [] },
    skillChoices: { count: 0, from: [] },
    caster: 'none',
    spellcastingAbility: null,
    features: [],
    subclassLevel: null,
    subclasses: [],
    ...over,
});

const e = (c: GameClassData, level: number): ResolvedClassEntry => ({
    classId: c.id,
    level,
    class: c,
    subclass: null,
});

describe('classHp', () => {
    it('first level max die, then average', () =>
        expect(classHp([e(cls({ hitDie: 10 }), 3)], 14)).toBe(
            10 + 2 + 2 * (6 + 2)
        ));

    it('multiclass: only the first class gets max die', () =>
        expect(
            classHp([e(cls({ hitDie: 10 }), 1), e(cls({ hitDie: 6 }), 2)], 10)
        ).toBe(10 + 4 + 4));

    it("multiclassing into a new class adds that class's average die", () => {
        const wizard = cls({ id: 'wizard', hitDie: 6 });

        const fighter = cls({ id: 'fighter', hitDie: 10 });

        const before = classHp([e(wizard, 3)], 14);

        expect(classHp([e(wizard, 3), e(fighter, 1)], 14)).toBe(
            before + (10 / 2 + 1 + 2)
        );
    });

    it('at least 1 per level', () =>
        expect(classHp([e(cls({ hitDie: 6 }), 3)], 1)).toBe(3));

    it('unknown class contributes nothing', () =>
        expect(
            classHp(
                [{ classId: 'x', level: 4, class: null, subclass: null }],
                10
            )
        ).toBe(0));

    it('a dangling first class does not pass the max die on', () => {
        const dangling = {
            classId: 'x',
            level: 1,
            class: null,
            subclass: null,
        } as ResolvedClassEntry;

        expect(classHp([dangling, e(cls({ hitDie: 10 }), 1)], 10)).toBe(6 + 0);
    });
});
