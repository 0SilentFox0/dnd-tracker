import { describe, expect, it, vi } from 'vitest';

import { withWfrpState } from '../../state';

import { CombatStatus } from '@/lib/constants/battle';
import {
    makeParticipant,
    resolved,
    seq,
} from '@/lib/utils/abilities/__tests__/fixtures';
import { applyHeal } from '@/lib/utils/abilities/registry/effects/hp';
import { keepsDown, statusForHp } from '@/lib/utils/battle/participant/state';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';

const downed = (outOfFight: boolean) => {
    const p = makeParticipant({ id: 'a', hp: 0, maxHp: 20 });

    const unconscious = {
        ...p,
        combatStats: { ...p.combatStats, status: CombatStatus.UNCONSCIOUS },
    };

    return outOfFight
        ? withWfrpState(unconscious, { outOfFight: true })
        : unconscious;
};

describe('keepsDown', () => {
    it('holds an out-of-fight participant down above 0 HP', () => {
        expect(statusForHp(downed(true), 5, false, WFRP_RULES)).toBe(
            CombatStatus.UNCONSCIOUS
        );
        expect(keepsDown(downed(true), WFRP_RULES)).toBe(true);
    });

    it('raises an ordinary unconscious participant', () => {
        expect(statusForHp(downed(false), 5, false, WFRP_RULES)).toBe(
            CombatStatus.ACTIVE
        );
    });

    it('still lets kill override', () => {
        expect(statusForHp(downed(true), 5, true, WFRP_RULES)).toBe(
            CombatStatus.DEAD
        );
    });

    it('does nothing without rules', () => {
        expect(statusForHp(downed(true), 5)).toBe(CombatStatus.ACTIVE);
    });
});

describe('abilities heal on a held-down target', () => {
    it('raises HP, keeps UNCONSCIOUS and skips onRevived', () => {
        const combat = ruleSystemOf(WFRP_RULES).combat;

        const spy = vi.spyOn(combat, 'onRevived');

        const out = applyHeal({
            participants: [downed(true)],
            ability: resolved({
                id: 'heal',
                name: 'Heal',
                effects: [],
            } as never),
            effectIndex: 0,
            ownerId: 'a',
            effect: { kind: 'heal', amount: 5, revive: true, target: 'self' },
            targetIds: ['a'],
            event: { type: 'turnStart', actorId: 'a' } as never,
            ctx: { rules: WFRP_RULES, round: 1, rng: seq(0.5) } as never,
        });

        const healed = out.participants[0];

        expect(healed.combatStats.currentHp).toBe(5);
        expect(healed.combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });
});
