import { describe, expect, it } from 'vitest';

import { wfrpOnZeroHp } from '../on-zero-hp';

import { CombatStatus } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { mulberry32 } from '@/lib/utils/common/rng';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';

const run = (
    beforeStatus: (typeof CombatStatus)[keyof typeof CombatStatus]
) => {
    const before = makeParticipant({ id: 'a', hp: 5, maxHp: 20 });

    const down = {
        ...before,
        combatStats: { ...before.combatStats, status: beforeStatus },
    };

    const after = {
        ...down,
        combatStats: { ...down.combatStats, currentHp: 0 },
    };

    return wfrpOnZeroHp({
        before: down,
        after,
        amount: 5,
        rng: mulberry32(1),
        participants: [after],
        rules: WFRP_RULES,
        round: 1,
    });
};

describe('wfrpOnZeroHp', () => {
    it('active target going to 0 falls unconscious with a log line and a crit', () => {
        const r = run(CombatStatus.ACTIVE);

        expect(r.participant.combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
        expect(r.messages).toHaveLength(2);
    });

    it('already unconscious target gets no second line and no crit', () => {
        const r = run(CombatStatus.UNCONSCIOUS);

        expect(r.participant.combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
        expect(r.messages).toEqual([]);
    });
});
