import { describe, expect, it, vi } from 'vitest';

import { AttackType, ParticipantSide } from '@/lib/constants/battle';
import { placed } from '@/lib/utils/battle/__tests__/fixtures/placed';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { BattleAttack } from '@/types/battle';

const seen = vi.hoisted(() => ({
    inTest: false,
    obstacle: undefined as unknown,
}));

vi.mock('@/lib/utils/rules/systems', async (importOriginal) => {
    const { D6POOL_SYSTEM: base } = await import(
        '@/lib/__tests__/fixtures/d6pool/definition'
    );

    const system = {
        ...base,
        combat: {
            ...base.combat,
            resolveAttack: (
                ctx: Parameters<typeof base.combat.resolveAttack>[0]
            ) => {
                seen.obstacle = ctx.obstacle;

                return {
                    ...base.combat.resolveAttack(ctx),
                    ...(seen.inTest && { obstacleInTest: true as const }),
                };
            },
        },
    };

    return {
        ...(await importOriginal<object>()),
        ruleSystemOf: () => system,
        ruleSystemByKey: () => system,
    };
});

vi.resetModules();

const { processAttack } = await import('../process/run');

const SPEAR: BattleAttack = {
    id: 's',
    name: 'Spear',
    type: AttackType.MELEE,
    attackBonus: 0,
    damageDice: '1d4',
    damageType: 'piercing',
};

const strike = (obstacle: boolean) => {
    const attacker = placed('a', {
        side: ParticipantSide.ALLY,
        hp: 20,
        attacks: [SPEAR],
    });

    const target = placed('t', {
        side: ParticipantSide.ENEMY,
        hp: 40,
        attacks: [SPEAR],
    });

    return processAttack({
        attacker,
        target,
        attack: SPEAR,
        d20Roll: 6,
        damageRolls: [4],
        allParticipants: [attacker, target],
        currentRound: 1,
        battleId: 'b',
        rules: DEFAULT_RULES,
        rng: () => 0.5,
        obstacle,
    });
};

const taken = (obstacle: boolean) =>
    40 - strike(obstacle).targetUpdated.combatStats.currentHp;

describe('obstacleInTest', () => {
    it('the resolver sees the obstacle and the pipeline halves the damage', () => {
        seen.inTest = false;

        const open = taken(false);

        expect(open).toBeGreaterThan(1);
        expect(taken(true)).toBe(Math.floor(open / 2));
        expect(seen.obstacle).toBe(true);
    });

    it('a resolver that priced the cover in its test keeps the full damage', () => {
        seen.inTest = false;

        const open = taken(false);

        seen.inTest = true;

        expect(taken(true)).toBe(open);
    });
});
