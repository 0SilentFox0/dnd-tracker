import { describe, expect, it, vi } from 'vitest';

import { critDoublesDice } from '../crit-dice';
import { processAttack } from '../process/run';

import { D6POOL_SYSTEM } from '@/lib/__tests__/fixtures/d6pool/definition';
import { AttackType, ParticipantSide } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import { placed } from '@/lib/utils/battle/__tests__/fixtures/placed';
import { DEFAULT_RULES } from '@/lib/utils/rules/defaults';
import type { DamageCtx } from '@/lib/utils/rules/systems/types';
import type { BattleAttack } from '@/types/battle';

const damage = vi.hoisted(() => vi.fn());

vi.mock('@/lib/utils/rules/systems', async (importOriginal) => {
    const { D6POOL_SYSTEM: base } = await import(
        '@/lib/__tests__/fixtures/d6pool/definition'
    );

    const system = {
        ...base,
        combat: {
            ...base.combat,
            damage,
            resolveAttack: (
                ctx: Parameters<typeof base.combat.resolveAttack>[0]
            ) => {
                const r = base.combat.resolveAttack(ctx);

                return { ...r, attackRoll: { ...r.attackRoll, margin: 1 } };
            },
        },
    };

    return {
        ...(await importOriginal<object>()),
        ruleSystemOf: () => system,
        ruleSystemByKey: () => system,
    };
});

const SPEAR: BattleAttack = {
    id: 's',
    name: 'Spear',
    type: AttackType.MELEE,
    attackBonus: 0,
    damageDice: '1d4',
    damageType: 'piercing',
};

const strike = () => {
    const attacker = placed('a', {
        side: ParticipantSide.ALLY,
        hp: 20,
        attacks: [SPEAR],
    });

    const target = placed('t', {
        side: ParticipantSide.ENEMY,
        hp: 20,
        attacks: [SPEAR],
    });

    return processAttack({
        attacker,
        target,
        attack: SPEAR,
        d20Roll: 6,
        damageRolls: [2],
        allParticipants: [attacker, target],
        currentRound: 1,
        battleId: 'b',
        rules: DEFAULT_RULES,
        rng: () => 0.5,
    });
};

describe('damage goes through combat.damage only', () => {
    it("crit dice doubling is the hook's answer, not rules.criticals", () => {
        damage.mockReturnValue({ doubleDice: true });

        expect(DEFAULT_RULES.criticals.doubleDice).toBe(false);
        expect(critDoublesDice(DEFAULT_RULES, true)).toBe(true);
        expect(
            D6POOL_SYSTEM.combat.damage({ rules: DEFAULT_RULES, crit: true })
                .doubleDice
        ).toBe(false);
    });

    it("a hit takes its damage from the hook's mitigation", () => {
        damage.mockImplementation((ctx: DamageCtx) => ({
            doubleDice: false,
            ...(ctx.hit && {
                mitigated: {
                    amount: 7,
                    steps: [],
                    totalLabel: textRef('battleLog.damage.steps.obstacle'),
                },
            }),
        }));

        expect(strike().targetUpdated.combatStats.currentHp).toBe(13);
    });
});
