import { describe, expect, it } from 'vitest';

import srdRules from '@/data/templates/srd-5.2/rules.json';
import {
    makeParticipant,
    resolved,
} from '@/lib/utils/abilities/__tests__/fixtures';
import { bakePassives } from '@/lib/utils/abilities/build/bake';
import { appendToInitiativeEnd } from '@/lib/utils/battle/summon/append-summoned-unit';
import {
    calculateInitiative,
    sortByInitiative,
    staticInitiative,
} from '@/lib/utils/battle/turn/initiative';
import { DEFAULT_RULES } from '@/lib/utils/rules/defaults';
import { parseRules, RulesetSchema } from '@/lib/utils/rules/schema';
import { ALWAYS_FIRST_ABILITY } from '@/scripts/constructor/backfill/always-first';

const SRD_RULES = RulesetSchema.parse(srdRules);

const withBase = (
    id: string,
    baseInitiative: number,
    abilities = [] as ReturnType<typeof resolved>[]
) => {
    const p = makeParticipant({ id, abilities });

    return {
        ...p,
        abilities: {
            ...p.abilities,
            baseInitiative,
            initiative: baseInitiative,
        },
    };
};

describe('calculateInitiative', () => {
    it('does not special-case names any more', () => {
        const p = withBase('Файдаен', 12);

        expect(
            calculateInitiative(p, undefined, { rules: DEFAULT_RULES })
        ).toBe(12);
    });

    it('the always-first ability puts a participant first', () => {
        const first = bakePassives(
            withBase('a', 12, [resolved(ALWAYS_FIRST_ABILITY)])
        );

        const other = withBase('b', 20);

        expect(first.abilities.baseInitiative).toBe(1011);
        expect(
            sortByInitiative([other, first], DEFAULT_RULES)[0].basicInfo.id
        ).toBe('a');
    });
});

describe('initiative mode', () => {
    const rollRules = parseRules({
        system: { key: 'homm' },
        initiative: { heroMin: 0, heroMax: 20, mode: 'roll' },
    });

    const withDex = (id: string, dexterity: number, baseInitiative = 5) => {
        const p = withBase(id, baseInitiative);

        return { ...p, abilities: { ...p.abilities, dexterity } };
    };

    const fixed = (value: number) => () => (value - 1) / 20 + 0.001;

    it('defaults to static and ignores the roll', () => {
        expect(DEFAULT_RULES.initiative.mode).toBe('static');
        expect(
            calculateInitiative(withDex('a', 18), undefined, {
                rules: DEFAULT_RULES,
                rng: fixed(20),
            })
        ).toBe(5);
    });

    it('staticInitiative never rolls, even in roll mode', () => {
        const p = withDex('a', 16);

        const values = new Set(
            Array.from({ length: 20 }, () =>
                staticInitiative(p, [p], rollRules)
            )
        );

        expect(values.size).toBe(1);
        expect([...values][0]).toBe(p.abilities.baseInitiative);
    });

    it('a summon is appended with its static initiative in roll mode', () => {
        const p = withDex('s', 16, 7);

        const values = new Set(
            Array.from({ length: 20 }, () => {
                const { added } = appendToInitiativeEnd([], p, rollRules);

                return added.abilities.initiative;
            })
        );

        expect([...values]).toEqual([7]);
    });

    it('the SRD preset rolls', () => {
        expect(SRD_RULES.initiative.mode).toBe('roll');
    });

    it('roll mode is d20 + DEX modifier, bounded 1+mod..20+mod', () => {
        const p = withDex('a', 16);

        expect(
            calculateInitiative(p, undefined, {
                rules: rollRules,
                rng: fixed(1),
            })
        ).toBe(1 + 3);
        expect(
            calculateInitiative(p, undefined, {
                rules: rollRules,
                rng: fixed(20),
            })
        ).toBe(20 + 3);
        expect(
            calculateInitiative(withDex('b', 8), undefined, {
                rules: rollRules,
                rng: fixed(10),
            })
        ).toBe(10 - 1);
    });

    it('roll mode keeps baked passive bonuses and timed modifiers', () => {
        const bonus = resolved({
            trigger: { event: 'passive' },
            effects: [{ kind: 'modifyStat', stat: 'initiative', flat: 5 }],
        });

        const base = withBase('a', 5, [bonus]);

        const p = bakePassives({
            ...base,
            abilities: { ...base.abilities, dexterity: 10 },
        });

        expect(p.abilities.initiativeBonus).toBe(5);
        expect(
            calculateInitiative(p, undefined, {
                rules: rollRules,
                rng: fixed(7),
            })
        ).toBe(7 + 0 + 5);
    });

    it('always-first stays first in roll mode', () => {
        const first = bakePassives(
            withBase('a', 12, [resolved(ALWAYS_FIRST_ABILITY)])
        );

        expect(
            calculateInitiative(first, undefined, {
                rules: rollRules,
                rng: fixed(1),
            })
        ).toBe(first.abilities.baseInitiative);
    });
});
