import { describe, expect, it, vi } from 'vitest';

import { D6POOL_SYSTEM } from '@/lib/__tests__/fixtures/d6pool/definition';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import {
    applyDamageConsequences,
    settleStatusChange,
} from '@/lib/utils/battle/damage/consequences';
import { DEFAULT_RULES } from '@/lib/utils/rules';

const calls = vi.hoisted(() => [] as string[]);

vi.mock('@/lib/utils/rules/systems', async (importOriginal) => {
    const { D6POOL_SYSTEM: base } = await import(
        '@/lib/__tests__/fixtures/d6pool/definition'
    );

    const tag =
        (name: string) => (_ctx: unknown, result: { messages: string[] }) => {
            calls.push(name);

            return { ...result, messages: [...result.messages, name] };
        };

    const system = {
        ...base,
        combat: {
            ...base.combat,
            onZeroHp: (ctx: {
                after: unknown;
                participants: unknown[];
                manual?: boolean;
            }) => {
                calls.push(ctx.manual ? 'zero:manual' : 'zero');

                return {
                    participant: ctx.after,
                    participants: ctx.participants,
                    messages: ['zero'],
                };
            },
            onDamaged: [tag('first'), tag('second')],
        },
    };

    return {
        ...(await importOriginal<object>()),
        ruleSystemOf: () => system,
        ruleSystemByKey: () => system,
    };
});

const target = createMockParticipant();

const input = {
    before: target,
    after: target,
    amount: 3,
    rules: DEFAULT_RULES,
    rng: () => 0.5,
    participants: [target],
};

describe('applyDamageConsequences goes through the system hooks', () => {
    it('runs onZeroHp, then the onDamaged list in order', () => {
        calls.length = 0;

        const r = applyDamageConsequences(input);

        expect(calls).toEqual(['zero', 'first', 'second']);
        expect(r.messages).toEqual(['zero', 'first', 'second']);
    });

    it('settleStatusChange calls only onZeroHp, as manual', () => {
        calls.length = 0;

        settleStatusChange(target, target, [target], DEFAULT_RULES);

        expect(calls).toEqual(['zero:manual']);
    });
});

describe('d6pool stub', () => {
    it('onZeroHp changes nothing', () => {
        const r = D6POOL_SYSTEM.combat.onZeroHp({
            ...input,
            rules: DEFAULT_RULES,
        });

        expect(r).toEqual({
            participant: target,
            participants: [target],
            messages: [],
        });
    });
});
