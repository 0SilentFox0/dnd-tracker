import { describe, expect, it } from 'vitest';

import {
    CombatStatus,
    ParticipantSourceType,
    type ParticipantSourceTypeValue,
} from '@/lib/constants/battle';
import { applyRawDamage } from '@/lib/utils/abilities/engine/effects/hp';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { type Ruleset } from '@/lib/utils/rules';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import { deathSavesOnZeroHp } from '@/systems/deathsaves/rules/on-zero-hp';
import { deathSavesOf } from '@/systems/deathsaves/rules/state';
import type { BattleParticipant } from '@/types/battle';

const rules: Ruleset = {
    ...DEFAULT_RULES,
    deathSaves: {
        ...DEFAULT_RULES.deathSaves,
        enabled: true,
        unitsDieAtZero: true,
    },
};

const mock = (
    sourceType: ParticipantSourceTypeValue,
    hp: number,
    maxHp = 20
): BattleParticipant => {
    const base = createMockParticipant();

    return createMockParticipant({
        basicInfo: { ...base.basicInfo, sourceType },
        combatStats: { ...base.combatStats, currentHp: hp, maxHp, tempHp: 0 },
    });
};

const hit = (before: BattleParticipant, amount: number) =>
    deathSavesOnZeroHp({
        before,
        after: applyRawDamage(before, amount),
        amount,
        rules,
        rng: () => 0.5,
        participants: [before],
    });

describe('deathSavesOnZeroHp', () => {
    it('a hero dropped to 0 starts dying', () => {
        const r = hit(mock(ParticipantSourceType.CHARACTER, 5), 6);

        expect(r.participant.combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
        expect(deathSavesOf(r.participant)).toEqual({
            successes: 0,
            failures: 0,
            stable: false,
        });
    });

    it('overflow of at least max HP kills a hero outright', () => {
        const r = hit(mock(ParticipantSourceType.CHARACTER, 5), 30);

        expect(r.participant.combatStats.status).toBe(CombatStatus.DEAD);
    });

    it('a unit dies at 0', () => {
        const r = hit(mock(ParticipantSourceType.UNIT, 5), 6);

        expect(r.participant.combatStats.status).toBe(CombatStatus.DEAD);
    });
});
