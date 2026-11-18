import { describe, expect, it } from 'vitest';

import {
    bareD20Rules,
    dnd5eRules,
} from '@/lib/__tests__/helpers/dnd5e-modules';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { processStartOfRound } from '@/lib/utils/battle/turn/round-start';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { lairStateData } from '@/systems/lair/rules/state';

const lairHolder = () => {
    const p = createMockParticipant();

    return {
        ...p,
        battleData: {
            ...p.battleData,
            ...lairStateData(p, { active: true, baseResistances: 0 }),
            resolvedAbilities: [
                { trigger: { event: 'turnStart' }, limits: { lair: true } },
            ],
        },
    } as unknown as typeof p;
};

const roundStart = (rules: ReturnType<typeof dnd5eRules>) =>
    processStartOfRound([lairHolder()], 2, [], () => 0.5, null, rules);

describe('lair module composition', () => {
    it('the module adds the round-start hook', () => {
        expect(
            ruleSystemOf(dnd5eRules()).combat.turn?.onRoundStart
        ).toHaveLength(1);
        expect(
            ruleSystemOf(bareD20Rules()).combat.turn?.onRoundStart ?? []
        ).toHaveLength(0);
    });

    it('an active lair logs its line only with the module', () => {
        expect(roundStart(dnd5eRules()).hookMessages).toHaveLength(1);
        expect(roundStart(bareD20Rules()).hookMessages).toEqual([]);
    });

    it('is silent without an active lair', () => {
        const p = createMockParticipant();

        expect(
            processStartOfRound([p], 2, [], () => 0.5, null, dnd5eRules())
                .hookMessages
        ).toEqual([]);
    });
});
