import { describe, expect, it } from 'vitest';

import { CombatStatus } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import {
    isAttackable,
    isDying,
} from '@/lib/utils/abilities/engine/core/participants';
import type { BattleParticipant } from '@/types/battle';

const down = (
    battleData: Partial<BattleParticipant['battleData']>,
    status: BattleParticipant['combatStats']['status'] = CombatStatus.UNCONSCIOUS
): BattleParticipant => {
    const p = makeParticipant({ id: 'd', hp: 0 });

    return {
        ...p,
        combatStats: { ...p.combatStats, currentHp: 0, status },
        battleData: { ...p.battleData, ...battleData },
    };
};

const SAVES = { successes: 0, failures: 0, stable: false };

describe('isDying', () => {
    it('the neutral flag marks a dying hero (new form)', () => {
        expect(isDying(down({ dying: true }))).toBe(true);
    });

    it('the old death saves counters still mark a dying hero (old form)', () => {
        expect(isDying(down({ deathSaves: SAVES }))).toBe(true);
    });

    it('an unconscious participant without either is not dying', () => {
        expect(isDying(down({}))).toBe(false);
    });

    it('a dead one is not dying, whichever form it is in', () => {
        expect(isDying(down({ dying: true }, CombatStatus.DEAD))).toBe(false);
        expect(isDying(down({ deathSaves: SAVES }, CombatStatus.DEAD))).toBe(
            false
        );
    });
});

describe('isAttackable', () => {
    it('a dying hero in either form can be attacked, a plain unconscious one cannot', () => {
        expect(isAttackable(down({ dying: true }))).toBe(true);
        expect(isAttackable(down({ deathSaves: SAVES }))).toBe(true);
        expect(isAttackable(down({}))).toBe(false);
    });
});
