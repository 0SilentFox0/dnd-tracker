import { describe, expect, it, vi } from 'vitest';

import { processAttack } from '../run';

import { D6POOL_SYSTEM } from '@/lib/__tests__/fixtures/d6pool/definition';
import { AttackType, ParticipantSide } from '@/lib/constants/battle';
import { placed } from '@/lib/utils/battle/__tests__/fixtures/placed';
import { DEFAULT_RULES } from '@/lib/utils/rules/defaults';
import type { BattleAttack } from '@/types/battle';

vi.mock('@/lib/utils/rules/systems', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    ruleSystemOf: () => D6POOL_SYSTEM,
    ruleSystemByKey: () => D6POOL_SYSTEM,
}));

const SPEAR: BattleAttack = {
    id: 's',
    name: 'Spear',
    type: AttackType.MELEE,
    attackBonus: 0,
    damageDice: '1d4',
    damageType: 'piercing',
};

const run = (d20Roll: number) => {
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
        d20Roll,
        damageRolls: [2],
        allParticipants: [attacker, target],
        currentRound: 1,
        battleId: 'b',
        rules: DEFAULT_RULES,
        rng: () => 0.5,
    });
};

describe('attack pipeline on a base that is not d20', () => {
    it("the system's resolveAttack decides the hit", () => {
        expect(run(6).success).toBe(true);
        expect(run(2).success).toBe(false);
    });

    it("the system's roll is what the log records", () => {
        expect(run(5).attackRoll.chosenD20).toBe(5);
    });
});
