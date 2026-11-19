import { describe, expect, it } from 'vitest';

import { makeParticipant, resolved } from './fixtures';

import { collectModifiers } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import { runAbilities } from '@/lib/utils/abilities/engine/core/run-abilities';
import { countMarks } from '@/lib/utils/abilities/engine/effects/marks';
import type { Ability } from '@/lib/utils/abilities/schema';
import { AbilitySchema } from '@/lib/utils/abilities/schema';
import { heldRider } from '@/lib/utils/battle/d20-rider/held';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { AbilityEvent } from '@/types/abilities';

const markOnHit = resolved({
    trigger: { event: 'hit', role: 'attacker' },
    effects: [
        {
            kind: 'mark',
            markId: 'seq',
            duration: { rounds: 2 },
            target: 'eventTarget',
        },
    ],
});

const perMark = resolved(
    {
        trigger: { event: 'passive' },
        effects: [
            {
                kind: 'damageBonus',
                filter: { kind: 'melee' },
                percent: 2,
                perMark: 'seq',
            },
        ],
    },
    { id: 'p' }
);

const hit = (actorId: string) =>
    ({
        type: 'hit',
        actorId,
        targetId: 't',
        attackKind: 'melee',
        damage: 5,
    }) as AbilityEvent;

describe('marks', () => {
    it('stack per source and drive perMark damage bonus', () => {
        let ps = [
            makeParticipant({ id: 'h', abilities: [markOnHit, perMark] }),
            makeParticipant({ id: 'h2', abilities: [markOnHit] }),
            makeParticipant({ id: 't' }),
        ];

        for (const actor of ['h', 'h', 'h2'])
            ps = runAbilities(ps, hit(actor), {
                rules: DEFAULT_RULES,
                round: 1,
                rng: () => 0,
            }).participants;

        const t = ps.find((p) => p.basicInfo.id === 't');

        expect(countMarks(t, 'seq', 'h')).toBe(2);
        expect(countMarks(t, 'seq', 'h2')).toBe(1);
        expect(
            collectModifiers(ps, 'h', {
                damage: { kind: 'melee', targetId: 't' },
            }).percent
        ).toBe(4);
        expect(
            collectModifiers(ps, 'h', { damage: { kind: 'melee' } }).percent
        ).toBe(0);
    });

    it('schema accepts mark and perMark', () => {
        const ability = {
            id: 'a',
            name: 'x',
            trigger: { event: 'hit', role: 'attacker' },
            effects: [{ kind: 'mark', markId: 'm', duration: { rounds: 1 } }],
        } as Ability;

        expect(AbilitySchema.safeParse(ability).success).toBe(true);
    });
});

describe('mark with a held d20 die', () => {
    const inspire = (amount: unknown) =>
        resolved({
            trigger: { event: 'bonusAction' },
            effects: [
                {
                    kind: 'mark',
                    markId: 'bardic-inspiration',
                    amount,
                    duration: { rounds: 99 },
                    target: 'eventTarget',
                },
            ] as Ability['effects'],
        });

    const cast = (amount: unknown, times = 1) => {
        let ps = [
            makeParticipant({ id: 'bard', abilities: [inspire(amount)] }),
            makeParticipant({ id: 'ally' }),
        ];

        for (let i = 0; i < times; i++)
            ps = runAbilities(
                ps,
                {
                    type: 'bonusAction',
                    actorId: 'bard',
                    abilityKey: ps[0].battleData.resolvedAbilities[0].key,
                    targetIds: ['ally'],
                },
                { rules: DEFAULT_RULES, round: 1, rng: () => 0 }
            ).participants;

        return ps.find((p) => p.basicInfo.id === 'ally');
    };

    it('stores the die size as a d20Rider effect, a "D8" column value included', () => {
        expect(heldRider(cast('D8')!)?.die).toBe(8);
        expect(heldRider(cast(10)!)?.die).toBe(10);
    });

    it('a second inspiration replaces the held die instead of stacking', () => {
        expect(cast('D6', 2)?.battleData.activeEffects).toHaveLength(1);
    });

    it('a plain mark carries no die', () => {
        expect(heldRider(cast(undefined)!)).toBeNull();
    });
});
