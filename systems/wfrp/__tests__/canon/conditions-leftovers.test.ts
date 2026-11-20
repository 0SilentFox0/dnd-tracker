import { describe, expect, it } from 'vitest';

import { bookExample, CANON } from './book-example';

import { CombatStatus } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { resolveOpposed } from '@/systems/wfrp/rules/combat/opposed';
import {
    participantStats,
    wfrpAbilitiesOf,
} from '@/systems/wfrp/rules/combat/participant';
import { applyWfrpConditionTo } from '@/systems/wfrp/rules/conditions/apply';
import type { WfrpConditionKey } from '@/systems/wfrp/rules/conditions/catalog';
import { attemptWfrpConditionEnd } from '@/systems/wfrp/rules/conditions/end-test';
import { conditionLevel } from '@/systems/wfrp/rules/conditions/levels';
import {
    againstSl,
    cannotDefend,
    selfModes,
    selfSlMod,
} from '@/systems/wfrp/rules/conditions/test-mod';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { PARTICIPANT_SLOT } from '@/systems/wfrp/rules/slots';
import type { BattleParticipant } from '@/types/battle';

const CANON_RULES = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const src = textRef('battleWfrp.log.removed', { target: 'x', condition: 'y' });

const make = (
    ...conds: Array<[WfrpConditionKey, number?]>
): BattleParticipant => {
    const base = makeParticipant({ id: 'a' });

    const withStats: BattleParticipant = {
        ...base,
        abilities: {
            ...base.abilities,
            ...wfrpAbilitiesOf(DEFAULT_CHARACTERISTICS),
        },
    };

    return conds.reduce(
        (acc, [key, levels]) =>
            applyWfrpConditionTo(acc, {
                key,
                levels,
                round: 1,
                sourceName: src,
                edition: CANON,
            }).participant,
        withStats
    );
};

const endTest = (p: BattleParticipant, key: string, presetRoll: number) =>
    attemptWfrpConditionEnd([p], 'a', key, {
        round: 2,
        rng: () => 0.5,
        rules: CANON_RULES,
        presetRoll,
    });

describe('canon5e conditions: leftovers', () => {
    bookExample(186, 'more Stunned than Toughness Bonus knocks the target out', () => {
        const three = make(['stunned', 3]);

        expect(conditionLevel(three, 'unconscious')).toBe(0);

        const four = make(['stunned', 4]);

        expect(conditionLevel(four, 'unconscious')).toBe(1);
        expect(four.combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
    });

    bookExample(187, 'falling Unconscious loses every Stunned', () => {
        const p = make(['stunned', 4]);

        expect(conditionLevel(p, 'stunned')).toBe(0);
    });

    bookExample(185, 'a removal test takes one more level per SL past the first', () => {
        const p = make(['ablaze', 3]);

        expect(conditionLevel(endTest(p, 'ablaze', 10).participants[0], 'ablaze')).toBe(1);
        expect(conditionLevel(endTest(p, 'ablaze', 25).participants[0], 'ablaze')).toBe(2);
    });

    bookExample(186, 'Fatigued comes after the last Stunned only without one already', () => {
        const plain = endTest(make(['stunned', 1]), 'stunned', 3).participants[0];

        expect(conditionLevel(plain, 'fatigued')).toBe(1);

        const tired = endTest(make(['stunned', 1], ['fatigued', 1]), 'stunned', 3)
            .participants[0];

        expect(conditionLevel(tired, 'fatigued')).toBe(1);
    });

    bookExample(185, 'Blinded gives Disadvantage to sight-based tests', () => {
        const p = make(['blinded']);

        expect(selfModes(p, 'test', CANON, 'climb')).toEqual({ disadvantage: 1 });
        expect(selfModes(p, 'test', CANON, 'endurance')).toEqual({});
    });

    bookExample(187, 'a Surprised defender cannot defend in an opposed test', () => {
        expect(cannotDefend(make(['surprised']), CANON)).toBe(true);
        expect(cannotDefend(make(['prone']), CANON)).toBe(false);

        const r = resolveOpposed({
            attackerTarget: 50,
            defenderTargets: [{ kind: 'parry', target: 99 }],
            edition: CANON,
            defenderHelpless: true,
            rng: () => 0,
            presetRolls: { attacker: 10, defender: 1 },
        });

        expect(r.defender.outcome).toBe('failure');
        expect(r.isHit).toBe(true);
    });

    bookExample(186, 'Entangled costs no SL and gives no melee edge', () => {
        const p = make(['entangled', 2]);

        expect(selfSlMod(p, CANON)).toBe(0);
        expect(againstSl(p, 'melee', CANON)).toEqual({ advantage: 0, sl: 0 });
    });

    it('Stunned beyond Toughness Bonus 0 knocks the target out', () => {
        const base = make();

        const slot = PARTICIPANT_SLOT.read(base.abilities.system)!;

        const weak: BattleParticipant = {
            ...base,
            abilities: {
                ...base.abilities,
                system: PARTICIPANT_SLOT.write({
                    ...slot,
                    stats: { ...slot.stats, tb: 0 },
                }),
            },
        };

        expect(participantStats(weak)?.tb).toBe(0);

        const out = applyWfrpConditionTo(weak, {
            key: 'stunned',
            round: 1,
            sourceName: src,
            edition: CANON,
        }).participant;

        expect(conditionLevel(out, 'unconscious')).toBe(1);
    });

    it('a Bleeding end test removes one level per success, not per SL', () => {
        const p = make(['bleeding', 3]);

        const next = endTest(p, 'bleeding', 1);

        expect(next.success).toBe(true);
        expect(conditionLevel(next.participants[0], 'bleeding')).toBe(2);
    });
});
