import { describe, expect, it } from 'vitest';

import { fortuneConditionMutation } from '../battle/fortune-condition-mutation';

import '@/lib/server/systems/registry';
import { context } from '@/lib/server/battles/__tests__/mutations/fixtures';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { applyWfrpCondition } from '@/systems/wfrp/rules/conditions/apply';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { wfrpState, withWfrpState } from '@/systems/wfrp/rules/state';

const canon = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const legacy = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'legacy' },
});

const ctxOf = (rules: typeof canon, fortune: number, levels = 2) => {
    const base = makeParticipant({ id: 'a', hp: 20, maxHp: 20 });

    const hero = withWfrpState(
        { ...base, basicInfo: { ...base.basicInfo, controlledBy: 'dm' } },
        { fortune }
    );

    const { participants } = applyWfrpCondition([hero], 'a', {
        key: 'bleeding',
        levels,
        round: 1,
        sourceName: 'x',
    });

    const c = context({ participants, isDM: true });

    return { ...c, meta: { ...c.meta, rules } };
};

const body = { participantId: 'a', condition: 'bleeding' };

describe('canon: Fortune removes a condition (p133, p184)', () => {
    it('drops one level and one Fortune point', () => {
        const out = fortuneConditionMutation(ctxOf(canon, 2), body);

        const a = out.participants.find((p) => p.basicInfo.id === 'a')!;

        expect(wfrpState(a).fortune).toBe(1);
        expect(JSON.stringify(a.battleData.activeEffects)).toContain(
            'bleeding'
        );
        expect(JSON.stringify(out.events)).toContain(
            'battleWfrp.log.fortuneCondition'
        );
    });

    it('is refused without Fortune', () => {
        expect(() => fortuneConditionMutation(ctxOf(canon, 0), body)).toThrow(
            'errors.fortuneConditionUnavailable'
        );
    });

    it('is refused when the hero lacks the condition', () => {
        expect(() =>
            fortuneConditionMutation(ctxOf(canon, 2), {
                ...body,
                condition: 'blinded',
            })
        ).toThrow('errors.fortuneConditionUnavailable');
    });

    it('is refused under the legacy edition', () => {
        expect(() => fortuneConditionMutation(ctxOf(legacy, 2), body)).toThrow(
            'errors.fortuneConditionUnavailable'
        );
    });
});
