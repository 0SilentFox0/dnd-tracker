import { describe, expect, it } from 'vitest';

import { CombatStatus, ParticipantSourceType } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { markGuardedDamage } from '@/lib/utils/battle/damage/regen-guard';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import { d20RegenWake, regenGoesDown } from '@/systems/d20/rules/regen-down';
import type { BattleParticipant } from '@/types/battle';

function troll(): BattleParticipant {
    const p = makeParticipant({ id: 't' });

    return {
        ...p,
        basicInfo: { ...p.basicInfo, sourceType: ParticipantSourceType.UNIT },
        combatStats: { ...p.combatStats, currentHp: 0 },
        battleData: {
            ...p.battleData,
            resolvedAbilities: [
                {
                    key: 'regen',
                    id: 'regeneration',
                    name: 'Regeneration',
                    trigger: { event: 'turnStart' },
                    effects: [
                        {
                            kind: 'heal',
                            amount: 10,
                            target: 'self',
                            unlessDamagedBy: ['acid', 'fire'],
                        },
                    ],
                    source: { type: 'unit', id: 'u', name: 'Troll' },
                } as never,
            ],
        },
    };
}

const ctx = (after: BattleParticipant, damageType?: string) => ({
    before: after,
    after,
    amount: 5,
    damageType,
    rules: DEFAULT_RULES,
    rng: () => 0.5,
    participants: [after],
});

const downed = (): BattleParticipant => {
    const r = regenGoesDown(ctx(troll()));

    if (!r) throw new Error('not downed');

    return r.participant;
};

const wake = (p: BattleParticipant) =>
    d20RegenWake({
        participants: [p],
        id: 't',
        round: 2,
        rng: () => 0.5,
        rules: DEFAULT_RULES,
    });

describe('regeneration keep-alive', () => {
    it('goes unconscious at 0 HP when regeneration is intact', () => {
        const r = regenGoesDown(ctx(troll(), 'slashing'));

        expect(r?.participant.combatStats.status).toBe(
            CombatStatus.UNCONSCIOUS
        );
        expect(r?.participant.battleData.dying).toBeUndefined();
    });

    it('does not intercept a killing blow of a suppressing type', () => {
        expect(regenGoesDown(ctx(troll(), 'fire'))).toBeNull();
    });

    it('ignores units without regeneration', () => {
        const plain = troll();

        plain.battleData.resolvedAbilities = [];

        expect(regenGoesDown(ctx(plain))).toBeNull();
    });

    it('wakes at its turn when not suppressed', () => {
        const r = wake(downed());

        expect(r.participants[0].combatStats.status).toBe(CombatStatus.ACTIVE);
        expect(r.participants[0].combatStats.currentHp).toBeGreaterThan(0);
        expect(r.skipTurn).toBeUndefined();
    });

    it('dies at its turn when suppressed while down', () => {
        const down = downed();

        const r = wake(markGuardedDamage(down, 'acid'));

        expect(r.participants[0].combatStats.status).toBe(CombatStatus.DEAD);
    });
});
