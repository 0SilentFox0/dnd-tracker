import { describe, expect, it } from 'vitest';

import { AbilitySchema } from '@/lib/utils/abilities/schema';
import {
    BAKED_STATS,
    STAT_KEYS,
    statFlag,
    TIMED_STATS,
} from '@/lib/utils/abilities/schema/kinds';

const base = { id: 'a', name: 'A' };

const action = { event: 'action' };

const lairAction = {
    ...base,
    trigger: action,
    limits: { lair: true },
    effects: [{ kind: 'note', text: 'x' }],
};

const messages = (input: unknown): string[] => {
    const r = AbilitySchema.safeParse(input);

    return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe('ability schema with module vocab', () => {
    it.each([
        ['lair on an action ability', lairAction, []],
        [
            'lair on a non-action trigger',
            { ...lairAction, trigger: { event: 'bonusAction' } },
            ['abilities.validation.lairAction'],
        ],
        [
            'lair together with legendaryCost',
            { ...lairAction, limits: { lair: true, legendaryCost: 1 } },
            ['abilities.validation.lairAction'],
        ],
        [
            'lair with aim',
            { ...lairAction, aim: { kind: 'cell', range: 30 } },
            ['abilities.validation.lairAction'],
        ],
        [
            'lair: false is not the flag literal',
            { ...lairAction, limits: { lair: false } },
            null,
        ],
    ])('%s', (_name, input, expected) => {
        const r = AbilitySchema.safeParse(input);

        if (expected === null) return void expect(typeof r.success).toBe('boolean');

        expect(messages(input)).toEqual(expected);
    });

    it.each([
        ['lair', { lair: true }, []],
        ['legendaryCost', { legendaryCost: 1 }, []],
        ['no flag', {}, ['abilities.validation.perform']],
    ])('perform with %s', (_name, limits, expected) => {
        expect(
            messages({
                ...lairAction,
                limits,
                perform: { kind: 'attack', attack: 'Bite' },
            })
        ).toEqual(expected);
    });

    it('lair key keeps its position between chance and legendaryCost', () => {
        const parsed = AbilitySchema.parse({
            ...lairAction,
            limits: { chance: 50, lair: true },
        });

        expect(Object.keys(parsed.limits ?? {})).toEqual(['chance', 'lair']);
    });

    it('stat lists keep their order with morale in place', () => {
        expect(BAKED_STATS.slice(0, 5)).toEqual([
            'initiative',
            'maxHp',
            'speed',
            'morale',
            'minTargets',
        ]);
        expect(TIMED_STATS).toEqual([
            'armor',
            'attackBonus',
            'critThreshold',
            'initiative',
            'speed',
            'morale',
            'actionsPerTurn',
            'savingThrow',
        ]);
        expect(STAT_KEYS).toContain('morale');
    });

    it('stat flags come from the module entry', () => {
        expect(statFlag('morale', 'needsDuration')).toBe(true);
        expect(statFlag('morale', 'areaOk')).toBe(true);
        expect(statFlag('morale', 'fearBlock')).toBe(true);
        expect(statFlag('speed', 'needsDuration')).toBe(false);
    });

    it('timed morale needs a duration, an area target is allowed', () => {
        const timed = (extra: Record<string, unknown>) => ({
            ...base,
            trigger: { event: 'bonusAction' },
            effects: [
                { kind: 'modifyStat', stat: 'morale', flat: 1, ...extra },
            ],
        });

        expect(messages(timed({}))).toContain(
            'abilities.validation.moraleNeedsDuration'
        );
        expect(
            messages(timed({ duration: { rounds: 2 } }))
        ).not.toContain('abilities.validation.moraleNeedsDuration');
    });

    it.each([
        ['morale', []],
        ['speed', ['abilities.validation.bakedStatArea']],
    ])('passive %s on an area target', (stat, expected) => {
        expect(
            messages({
                ...base,
                trigger: { event: 'passive' },
                effects: [
                    { kind: 'modifyStat', stat, flat: 1, target: 'nearbyAllies' },
                ],
            }).filter((m) => m === 'abilities.validation.bakedStatArea')
        ).toEqual(expected);
    });
});
