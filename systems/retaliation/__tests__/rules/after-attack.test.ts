import { describe, expect, it, vi } from 'vitest';

import {
    extraRetaliations,
    unlimitedRetaliation,
} from '@/data/library/unit-abilities';
import { ParticipantSide } from '@/lib/constants/battle';
import type { CriticalEffect } from '@/lib/constants/critical-effects';
import { resolved } from '@/lib/utils/abilities/__tests__/fixtures';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { swordUnit } from '@/lib/utils/battle/attack/__tests__/helpers';
import { runAfterAttack } from '@/lib/utils/battle/attack-phase/after-attack';
import { DEFAULT_RULES, type Ruleset } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { AfterAttackCtx } from '@/lib/utils/rules/systems/types';
import { d20ProvokedOpportunity } from '@/systems/d20/rules/reactions/provoked';
import { retaliationAfterAttack } from '@/systems/retaliation/rules/after-attack';
import {
    retaliationStateData,
    retaliationsUsedOf,
} from '@/systems/retaliation/rules/state';
import type { BattleParticipant } from '@/types/battle';

const rulesOf = (system: Ruleset['system']): Ruleset => ({
    ...DEFAULT_RULES,
    system,
});

const bare = rulesOf({ key: 'dnd5e' });

const withModule = rulesOf({ key: 'dnd5e', modules: ['retaliation'] });

const answer = {
    participants: [createMockParticipant()],
    actions: [],
    sceneState: undefined,
};

const attacker = () => swordUnit('a', ParticipantSide.ALLY);

const ctxOf = (
    defender: BattleParticipant,
    over: Partial<AfterAttackCtx> = {}
): AfterAttackCtx & { strike: ReturnType<typeof vi.fn> } => {
    const strike = vi.fn(() => answer);

    return {
        participants: [attacker(), defender],
        attackerId: 'a',
        defenderId: 'd',
        first: true,
        round: 1,
        rules: DEFAULT_RULES,
        counterStrike: strike,
        strike,
        ...over,
    };
};

const defender = (abilities?: ReturnType<typeof resolved>[]) =>
    swordUnit('d', ParticipantSide.ENEMY, abilities);

const hooksOf = (rules: Ruleset) =>
    ruleSystemOf(rules).combat.afterAttack ?? [];

describe('retaliation module on d20', () => {
    it('without the module the target does not answer; with it the hook follows the d20 provocation', () => {
        expect(hooksOf(bare)).toEqual([d20ProvokedOpportunity]);
        expect(hooksOf(withModule)).toEqual([
            d20ProvokedOpportunity,
            retaliationAfterAttack,
        ]);
        expect(hooksOf(rulesOf({ key: 'homm' }))).toEqual([
            d20ProvokedOpportunity,
            retaliationAfterAttack,
        ]);
    });

    it('wfrp has no retaliation even with actions.retaliation on', () => {
        expect(DEFAULT_RULES.actions.retaliation).toBe(true);
        expect(hooksOf(rulesOf({ key: 'wfrp' }))).not.toContain(
            retaliationAfterAttack
        );
    });

    it('a provoking critical effect is answered once by the provocation and the module stays out', () => {
        const provoke = {
            effect: { type: 'provoke_opportunity_attack' },
        } as CriticalEffect;

        const ctx = ctxOf(defender(), { criticalEffect: provoke });

        const out = runAfterAttack(hooksOf(rulesOf({ key: 'homm' })), ctx);

        expect(ctx.strike).toHaveBeenCalledTimes(1);
        expect(ctx.strike).toHaveBeenCalledWith(true, expect.anything());
        expect(out?.handled).toBe(true);
    });

    it('a plain strike is answered once and the reaction is counted', () => {
        const ctx = ctxOf(defender());

        const out = runAfterAttack(hooksOf(withModule), ctx);

        expect(ctx.strike).toHaveBeenCalledTimes(1);
        expect(ctx.strike).toHaveBeenCalledWith(
            false,
            expect.objectContaining({ participants: expect.any(Array) })
        );
        expect(out?.handled).toBe(true);

        const [, from] = ctx.strike.mock.calls[0] as unknown as [
            boolean,
            { participants: BattleParticipant[] },
        ];

        const d = from.participants.find((p) => p.basicInfo.id === 'd');

        expect(d && retaliationsUsedOf(d)).toBe(1);
        expect(d?.actionFlags.hasUsedReaction).toBe(true);
    });
});

describe('retaliationAfterAttack', () => {
    it('skips later strikes of the volley, a handled strike and a critical miss', () => {
        for (const over of [
            { first: false },
            { handled: true as const },
            { critFail: true },
        ]) {
            const ctx = ctxOf(defender(), over);

            expect(retaliationAfterAttack(ctx)).toBeNull();
            expect(ctx.strike).not.toHaveBeenCalled();
        }
    });

    it('is off when rules.actions.retaliation is false', () => {
        const ctx = ctxOf(defender(), {
            rules: {
                ...DEFAULT_RULES,
                actions: { ...DEFAULT_RULES.actions, retaliation: false },
            },
        });

        expect(retaliationAfterAttack(ctx)).toBeNull();
        expect(ctx.strike).not.toHaveBeenCalled();
    });

    it('an exhausted reaction does not answer', () => {
        const d = defender();

        const spent = {
            ...d,
            actionFlags: { ...d.actionFlags, hasUsedReaction: true },
        };

        expect(retaliationAfterAttack(ctxOf(spent))).toBeNull();
    });

    it('extra retaliations raise the limit and keep the reaction until used up', () => {
        const d = defender([resolved(extraRetaliations(1))]);

        const first = ctxOf(d);

        retaliationAfterAttack(first);

        const [, from] = first.strike.mock.calls[0] as unknown as [
            boolean,
            { participants: BattleParticipant[] },
        ];

        const after = from.participants.find((p) => p.basicInfo.id === 'd');

        expect(after && retaliationsUsedOf(after)).toBe(1);
        expect(after?.actionFlags.hasUsedReaction).toBe(false);

        const second = ctxOf(after as BattleParticipant);

        expect(retaliationAfterAttack(second)).not.toBeNull();
        expect(
            retaliationAfterAttack(
                ctxOf({
                    ...(after as BattleParticipant),
                    battleData: {
                        ...(after as BattleParticipant).battleData,
                        ...retaliationStateData(after as BattleParticipant, 2),
                    },
                })
            )
        ).toBeNull();
    });

    it('unlimited retaliations are not counted', () => {
        const d = defender([resolved(unlimitedRetaliation())]);

        const ctx = ctxOf({
            ...d,
            actionFlags: { ...d.actionFlags, hasUsedReaction: true },
        });

        expect(retaliationAfterAttack(ctx)).not.toBeNull();
        expect(ctx.strike).toHaveBeenCalledWith(
            false,
            expect.objectContaining({ participants: ctx.participants })
        );
    });

    it('when the strike back cannot happen nothing is counted or claimed', () => {
        const ctx = ctxOf(defender(), { counterStrike: () => null });

        expect(retaliationAfterAttack(ctx)).toBeNull();
    });
});
