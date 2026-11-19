import { describe, expect, it } from 'vitest';

import { ParticipantSide } from '@/lib/constants/battle';
import {
    makeParticipant,
    resolved,
    seq,
} from '@/lib/utils/abilities/__tests__/fixtures';
import { runAbilities } from '@/lib/utils/abilities/engine/core/run-abilities';
import { grantPassive } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { AbilityEvent } from '@/types/abilities';

const rules = (doubleDice: boolean) => ({
    ...DEFAULT_RULES,
    criticals: { ...DEFAULT_RULES.criticals, doubleDice },
});

const sneak = resolved({
    trigger: { event: 'hit', role: 'attacker' },
    effects: [{ kind: 'dealDamage', amount: '2d6', target: 'eventTarget' }],
});

const rogue = makeParticipant({ id: 'rogue', abilities: [sneak] });

const victim = (resist?: number) => {
    const base = makeParticipant({
        id: 'v',
        side: ParticipantSide.ENEMY,
        hp: 100,
        maxHp: 100,
    });

    return resist === undefined
        ? base
        : grantPassive(base, [
              {
                  kind: 'flag',
                  flag: 'resistance',
                  damageType: 'slashing',
                  percent: resist,
              },
          ]);
};

const hit = (extra: Partial<Extract<AbilityEvent, { type: 'hit' }>> = {}) =>
    ({
        type: 'hit',
        actorId: 'rogue',
        targetId: 'v',
        attackKind: 'melee',
        damage: 5,
        ...extra,
    }) as AbilityEvent;

const hpAfter = (
    event: AbilityEvent,
    target = victim(),
    doubleDice = true
): number =>
    runAbilities([rogue, target], event, {
        rules: rules(doubleDice),
        round: 1,
        rng: seq(0.5),
    }).participants.find((p) => p.basicInfo.id === 'v')?.combatStats
        .currentHp ?? -1;

describe('dealDamage on hit', () => {
    it('rolls plain dice without a crit (2d6 at 0.5 = 8)', () => {
        expect(hpAfter(hit())).toBe(92);
    });

    it('doubles the dice on a crit', () => {
        expect(hpAfter(hit({ crit: true }))).toBe(84);
    });

    it('does not double when the rules do not double dice', () => {
        expect(hpAfter(hit({ crit: true }), victim(), false)).toBe(92);
    });

    it('applies the attack damage type resistance', () => {
        expect(hpAfter(hit({ damageType: 'slashing' }), victim(50))).toBe(96);
    });

    it('ignores resistance of another type', () => {
        expect(hpAfter(hit({ damageType: 'piercing' }), victim(50))).toBe(92);
    });

    it('stops damage fully against immunity', () => {
        expect(hpAfter(hit({ damageType: 'slashing' }), victim(100))).toBe(100);
    });

    it('keeps the old behaviour outside the 5e model (no resistance routing)', () => {
        expect(
            hpAfter(hit({ damageType: 'slashing' }), victim(100), false)
        ).toBe(92);
    });
});
