import { describe, expect, it } from 'vitest';

import { wfrpAbilitiesOf } from '../../combat/participant';
import { applyWfrpConditionTo } from '../apply';
import type { WfrpConditionKey } from '../catalog';
import { attemptWfrpConditionEnd } from '../end-test';
import { conditionLevel } from '../levels';

import { textRef } from '@/lib/i18n/text-ref';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import type { Characteristics } from '@/systems/wfrp/rules/characteristics/keys';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import type { BattleParticipant } from '@/types/battle';

const src = textRef('battleWfrp.log.removed', { target: 'x', condition: 'y' });

const make = (
    conds: Array<[WfrpConditionKey, number]>,
    characteristics: Characteristics = DEFAULT_CHARACTERISTICS
): BattleParticipant => {
    const base = makeParticipant({ id: 'a' });

    const withStats: BattleParticipant = {
        ...base,
        abilities: { ...base.abilities, ...wfrpAbilitiesOf(characteristics) },
    };

    return conds.reduce<BattleParticipant>(
        (acc, [key, levels]) =>
            applyWfrpConditionTo(acc, {
                key,
                levels,
                round: 1,
                sourceName: src,
            }).participant,
        withStats
    );
};

const attempt = (
    p: BattleParticipant,
    key: string,
    presetRoll?: number,
    rng: () => number = () => 0.5
) =>
    attemptWfrpConditionEnd([p], 'a', key, {
        round: 2,
        rng,
        rules: WFRP_RULES,
        presetRoll,
    });

describe('attemptWfrpConditionEnd', () => {
    it('bleeding: success drops one level, failure keeps it', () => {
        const ok = attempt(make([['bleeding', 2]]), 'bleeding', 10);

        expect(ok.success).toBe(true);
        expect(ok.messages[0]).toMatchObject({
            params: { roll: 10, target: 30 },
        });
        expect(conditionLevel(ok.participants[0], 'bleeding')).toBe(1);

        const bad = attempt(make([['bleeding', 2]]), 'bleeding', 90);

        expect(bad.success).toBe(false);
        expect(conditionLevel(bad.participants[0], 'bleeding')).toBe(2);
    });

    it('prone stands up without a roll', () => {
        const r = attempt(make([['prone', 1]]), 'prone');

        expect(r.success).toBe(true);
        expect(conditionLevel(r.participants[0], 'prone')).toBe(0);
    });

    it('own penalties lower the target', () => {
        const r = attempt(
            make([
                ['fatigued', 3],
                ['bleeding', 1],
            ]),
            'bleeding',
            25
        );

        expect(r.messages[0]).toMatchObject({ params: { target: 0 } });
        expect(r.success).toBe(false);
    });

    it('entangled tests S (minus its own penalty), not a skill', () => {
        const c: Characteristics = {
            ...DEFAULT_CHARACTERISTICS,
            base: { ...DEFAULT_CHARACTERISTICS.base, s: 47 },
        };

        expect(
            attempt(make([['entangled', 1]], c), 'entangled', 10).messages[0]
        ).toMatchObject({ params: { roll: 10, target: 37 } });
    });

    it('a condition without an end test is a no-op', () => {
        const p = make([['fatigued', 1]]);

        const r = attempt(p, 'fatigued', 10);

        expect(r.success).toBe(false);
        expect(r.participants[0]).toBe(p);
    });

    it('unknown key or missing condition is a no-op', () => {
        expect(attempt(make([]), 'nope', 10).success).toBe(false);
        expect(attempt(make([]), 'bleeding', 10).success).toBe(false);
    });

    it('uses the rng when no roll is preset', () => {
        const r = attempt(
            make([['bleeding', 1]]),
            'bleeding',
            undefined,
            () => 0.04
        );

        expect(r.messages[0]).toMatchObject({ params: { roll: 5 } });
        expect(r.success).toBe(true);
    });
});
