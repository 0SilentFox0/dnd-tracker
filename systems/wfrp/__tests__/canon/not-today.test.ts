import { describe, expect, it } from 'vitest';

import { bookExample } from './book-example';

import { CombatStatus } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { mulberry32 } from '@/lib/utils/common/rng';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { withStats } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { applyWfrpCrit } from '@/systems/wfrp/rules/combat/crit-effect';
import { rollCrit } from '@/systems/wfrp/rules/combat/crit-table';
import {
    isOutOfFight,
    recordCritWound,
    tickDeathTimer,
} from '@/systems/wfrp/rules/combat/critical';
import { wfrpOnZeroHp } from '@/systems/wfrp/rules/combat/on-zero-hp';
import { EDITION_PROFILES } from '@/systems/wfrp/rules/edition/profiles';
import {
    WFRP_RULES,
    WFRP_RULES_PRESET,
} from '@/systems/wfrp/rules/rules-preset';
import { wfrpState, withWfrpState } from '@/systems/wfrp/rules/state';

const CANON_RULES = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const hero = (fate?: number, tb = 2) => {
    const p = withStats(makeParticipant({ id: 'h', hp: 0, maxHp: 20 }), {
        sb: 0,
        tb,
    });

    const down = {
        ...p,
        combatStats: { ...p.combatStats, status: CombatStatus.UNCONSCIOUS },
    };

    return fate === undefined ? down : withWfrpState(down, { fate });
};

describe('canon: Not Today (p133)', () => {
    bookExample(
        133,
        'a deadly crit row with Fate leaves the fight alive',
        () => {
            const r = recordCritWound(hero(1), true);

            expect(r.combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
            expect(wfrpState(r).fate).toBe(0);
            expect(isOutOfFight(r)).toBe(true);
            expect(wfrpState(r).dyingRounds).toBeUndefined();
        }
    );

    bookExample(133, 'without Fate the same row kills', () => {
        const r = recordCritWound(hero(0), true);

        expect(r.combatStats.status).toBe(CombatStatus.DEAD);
        expect(isOutOfFight(r)).toBe(false);
    });

    bookExample(
        133,
        'the log line is Not Today instead of the death text',
        () => {
            const crit = rollCrit('body', WFRP_RULES, () => 0, 95, 30);

            const r = applyWfrpCrit(hero(1), crit, 1, EDITION_PROFILES.canon5e);

            expect(r.message).toMatchObject({
                message: 'battleWfrp.log.fateNotToday',
            });
        }
    );

    bookExample(
        133,
        'the death timer running out spends Fate and saves',
        () => {
            const p = withWfrpState(hero(1), { dyingRounds: 1 });

            const t = tickDeathTimer(p)!;

            expect(t.died).toBe(false);
            expect(isOutOfFight(t.participant)).toBe(true);
            expect(wfrpState(t.participant).fate).toBe(0);
        }
    );

    bookExample(133, 'the death timer without Fate kills', () => {
        const t = tickDeathTimer(withWfrpState(hero(0), { dyingRounds: 1 }))!;

        expect(t.died).toBe(true);
    });

    bookExample(
        133,
        'a participant out of the fight takes no further crit',
        () => {
            const before = withWfrpState(hero(0), { outOfFight: true });

            const r = wfrpOnZeroHp({
                before,
                after: before,
                amount: 5,
                rng: mulberry32(5),
                participants: [before],
                rules: CANON_RULES,
                round: 1,
            });

            expect(r.messages).toEqual([]);
            expect(wfrpState(r.participant).critWounds ?? 0).toBe(0);
        }
    );

    it('legacy rules have no Not Today', () => {
        expect(WFRP_RULES_PRESET).toBeDefined();
        expect(EDITION_PROFILES.legacy.fortunePools).not.toBe('split');
    });
});
