import { describe, expect, it, vi } from 'vitest';

import { CombatStatus, ParticipantSourceType } from '@/lib/constants/battle';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { applyDamageConsequences } from '@/lib/utils/battle/damage/consequences';
import { dealResistedDamage } from '@/lib/utils/battle/damage/resisted-ability-damage';
import { DEFAULT_RULES, type Ruleset } from '@/lib/utils/rules';
import { deathSavesOf } from '@/systems/d20/rules/death-saves/state';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { wfrpState } from '@/systems/wfrp/rules/state';
import type { BattleParticipant } from '@/types/battle';

const withRules = (deathSaves: Partial<Ruleset['deathSaves']>): Ruleset => ({
    ...DEFAULT_RULES,
    deathSaves: { ...DEFAULT_RULES.deathSaves, ...deathSaves },
});

function downed(sourceType: string): {
    before: BattleParticipant;
    after: BattleParticipant;
} {
    const before = createMockParticipant();

    before.basicInfo = {
        ...before.basicInfo,
        sourceType: sourceType as typeof before.basicInfo.sourceType,
    };

    return {
        before,
        after: {
            ...before,
            combatStats: {
                ...before.combatStats,
                currentHp: 0,
                status: CombatStatus.UNCONSCIOUS,
            },
        },
    };
}

describe('applyDamageConsequences', () => {
    it('returns the same participant and never rolls when rules are off', () => {
        const { before, after } = downed(ParticipantSourceType.UNIT);

        const rng = vi.fn(() => 0.5);

        const r = applyDamageConsequences({
            before,
            after,
            amount: 99,
            rules: DEFAULT_RULES,
            rng,
            participants: [after],
        });

        expect(r.participant).toBe(after);
        expect(r.messages).toEqual([]);
        expect(rng).not.toHaveBeenCalled();
    });

    it('kills a unit that drops to 0 HP when death saves are on', () => {
        const { before, after } = downed(ParticipantSourceType.UNIT);

        const r = applyDamageConsequences({
            before,
            after,
            amount: 99,
            rules: withRules({ enabled: true }),
            rng: () => 0.5,
            participants: [after],
        });

        expect(r.participant.combatStats.status).toBe(CombatStatus.DEAD);
        expect(r.participants[0].combatStats.status).toBe(CombatStatus.DEAD);
    });

    it('leaves the unit unconscious when unitsDieAtZero is off', () => {
        const { before, after } = downed(ParticipantSourceType.UNIT);

        const r = applyDamageConsequences({
            before,
            after,
            amount: 99,
            rules: withRules({ enabled: true, unitsDieAtZero: false }),
            rng: () => 0.5,
            participants: [after],
        });

        expect(r.participant.combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
    });

    it('hands a hero to death saves instead of the unit rule', () => {
        const { before, after } = downed(ParticipantSourceType.CHARACTER);

        const r = applyDamageConsequences({
            before,
            after,
            amount: 5,
            rules: withRules({ enabled: true }),
            rng: () => 0.5,
            participants: [after],
        });

        expect(r.participant.combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
        expect(deathSavesOf(r.participant)).toEqual({
            successes: 0,
            failures: 0,
            stable: false,
        });
        expect(r.participant.battleData.dying).toBe(true);
    });
});

describe('dealResistedDamage with rules', () => {
    it('marks a unit DEAD and reports it as downed', () => {
        const unit = createMockParticipant();

        unit.basicInfo = {
            ...unit.basicInfo,
            sourceType: ParticipantSourceType.UNIT,
        };

        const r = dealResistedDamage([unit], unit.basicInfo.id, 999, 'fire', {
            rules: withRules({ enabled: true }),
            rng: () => 0.5,
        });

        expect(r?.participants[0].combatStats.status).toBe(CombatStatus.DEAD);
        expect(r?.downed).toBe(true);
    });

    it('keeps UNCONSCIOUS under the default rules', () => {
        const unit = createMockParticipant();

        unit.basicInfo = {
            ...unit.basicInfo,
            sourceType: ParticipantSourceType.UNIT,
        };

        const r = dealResistedDamage([unit], unit.basicInfo.id, 999, 'fire', {
            rules: DEFAULT_RULES,
        });

        expect(r?.participants[0].combatStats.status).toBe(
            CombatStatus.UNCONSCIOUS
        );
    });
});

describe('applyDamageConsequences: channelled SL', () => {
    const channelling = () => {
        const before = createMockParticipant();

        before.battleData = { ...before.battleData, channelledSl: 3 };

        return {
            before,
            after: {
                ...before,
                combatStats: {
                    ...before.combatStats,
                    currentHp: before.combatStats.currentHp - 2,
                },
            },
        };
    };

    const input = (amount: number, rules: Ruleset) => ({
        ...channelling(),
        amount,
        rules,
        rng: () => 0.5,
    });

    it('a wounded WFRP caster loses channelled SL', () => {
        const i = input(2, WFRP_RULES);

        const r = applyDamageConsequences({ ...i, participants: [i.after] });

        expect(wfrpState(r.participant).channelledSl).toBeUndefined();
        expect(wfrpState(r.participants[0]).channelledSl).toBeUndefined();
    });

    it('no damage keeps it', () => {
        const i = input(0, WFRP_RULES);

        expect(
            wfrpState(
                applyDamageConsequences({ ...i, participants: [i.after] })
                    .participant
            ).channelledSl
        ).toBe(3);
    });

    it('d20 systems return the same participant', () => {
        const i = input(2, DEFAULT_RULES);

        expect(
            applyDamageConsequences({ ...i, participants: [i.after] })
                .participant
        ).toBe(i.after);
    });
});
