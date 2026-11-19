import { describe, expect, it } from 'vitest';

import { bookExample } from './book-example';

import { CombatStatus } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { mulberry32 } from '@/lib/utils/common/rng';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { withStats } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { rollCrit } from '@/systems/wfrp/rules/combat/crit-table';
import {
    critWoundsOf,
    recordCritWound,
    tickDeathTimer,
} from '@/systems/wfrp/rules/combat/critical';
import { wfrpOnZeroHp } from '@/systems/wfrp/rules/combat/on-zero-hp';
import {
    WFRP_RULES,
    WFRP_RULES_PRESET,
} from '@/systems/wfrp/rules/rules-preset';
import { wfrpState } from '@/systems/wfrp/rules/state';

const CANON_RULES = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const hit = (rules: typeof CANON_RULES, hp: number, amount: number, tb = 3) => {
    const base = withStats(makeParticipant({ id: 't', hp, maxHp: 20 }), {
        sb: 0,
        tb,
    });

    const after = {
        ...base,
        combatStats: {
            ...base.combatStats,
            currentHp: Math.max(0, hp - amount),
            status:
                hp - amount <= 0
                    ? CombatStatus.UNCONSCIOUS
                    : base.combatStats.status,
        },
    };

    return wfrpOnZeroHp({
        before: base,
        after,
        amount,
        rng: mulberry32(5),
        participants: [after],
        rules,
        round: 1,
    });
};

describe('canon: Wounds and Critical Wounds (p171-172)', () => {
    bookExample(
        171,
        'damage that only reaches 0 Wounds inflicts no Critical Wound',
        () => {
            const r = hit(CANON_RULES, 5, 5);

            expect(critWoundsOf(r.participant)).toBe(0);
        }
    );

    bookExample(171, 'damage beyond 0 inflicts a Critical Wound', () => {
        const r = hit(CANON_RULES, 5, 8);

        expect(critWoundsOf(r.participant)).toBe(1);
    });

    bookExample(
        171,
        'a blow at 0 Wounds inflicts a Critical Wound again',
        () => {
            const r = hit(CANON_RULES, 0, 2);

            expect(critWoundsOf(r.participant)).toBe(1);
        }
    );

    bookExample(
        171,
        '+10 per excess Wound can push the roll past the table into death',
        () => {
            const crit = rollCrit('body', WFRP_RULES, () => 0, 95, 30);

            expect(crit.death).toBe(true);
        }
    );

    bookExample(
        171,
        'without the excess the same roll stays a normal row',
        () => {
            const crit = rollCrit('body', WFRP_RULES, () => 0, 95, 0);

            expect(crit.death).toBe(false);
        }
    );

    bookExample(
        172,
        'more Critical Wounds than TB while unconscious starts a TB-round death timer',
        () => {
            let p = withStats(makeParticipant({ id: 'x', hp: 0, maxHp: 20 }), {
                sb: 0,
                tb: 2,
            });

            p = {
                ...p,
                combatStats: {
                    ...p.combatStats,
                    status: CombatStatus.UNCONSCIOUS,
                },
            };

            for (let i = 0; i < 3; i++) p = recordCritWound(p, false);

            expect(wfrpState(p).dyingRounds).toBe(2);
            expect(tickDeathTimer(p)?.died).toBe(false);

            const second = tickDeathTimer(tickDeathTimer(p)!.participant);

            expect(second?.died).toBe(true);
            expect(second?.participant.combatStats.status).toBe(
                CombatStatus.DEAD
            );
        }
    );

    it('the legacy edition still drops and crits on reaching 0', () => {
        const r = hit(WFRP_RULES, 5, 5);

        expect(r.participant.combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
        expect(r.messages).toHaveLength(2);
    });
});
