import { describe, expect, it } from 'vitest';

import { AttackType, ParticipantSide } from '@/lib/constants/battle';
import type { StaticEffect } from '@/lib/utils/abilities/schema';
import {
    createMockParticipant,
    grantPassive,
} from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { createCritGate } from '@/lib/utils/battle/crit-choice/gate';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { ResolveAttackCtx } from '@/lib/utils/rules/systems/types';
import {
    d20AbortedRoll,
    resolveD20Attack,
} from '@/systems/d20/rules/attack/resolve';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const SWORD: BattleAttack = {
    id: 's',
    name: 'Sword',
    type: AttackType.MELEE,
    attackBonus: 5,
    damageDice: '1d6',
    damageType: 'slashing',
};

const flag = (f: string) => ({ kind: 'flag', flag: f }) as StaticEffect;

const mk = (id: string, side: ParticipantSide, ac = 14): BattleParticipant => {
    const base = createMockParticipant();

    return {
        ...base,
        basicInfo: { ...base.basicInfo, id, name: id, side },
        combatStats: { ...base.combatStats, armorClass: ac },
        battleData: { ...base.battleData, attacks: [SWORD] },
    };
};

const ctx = (
    attacker: BattleParticipant,
    target: BattleParticipant,
    over: Partial<ResolveAttackCtx> = {}
): ResolveAttackCtx => ({
    attacker,
    target,
    attack: SWORD,
    participants: [attacker, target],
    rules: DEFAULT_RULES,
    rng: () => 0.5,
    manualRoll: 10,
    ...over,
});

const A = () => mk('a', ParticipantSide.ALLY);

const T = (ac = 14) => mk('t', ParticipantSide.ENEMY, ac);

describe('resolveD20Attack hit threshold', () => {
    it.each([
        [4, false],
        [5, true],
        [6, true],
    ])('d20 %i + 9 (5 + STR 2 + prof 2) vs AC 14 hits=%s', (roll, hit) => {
        const r = resolveD20Attack(ctx(A(), T(), { manualRoll: roll }));

        expect(r.defenseValue).toBe(14);
        expect(r.attackRoll.totalAttackValue).toBe(roll + 9);
        expect(r.isHit).toBe(hit);
    });

    it('a natural 20 hits regardless of AC and is critical', () => {
        const r = resolveD20Attack(ctx(A(), T(40), { manualRoll: 20 }));

        expect(r.isHit).toBe(true);
        expect(r.attackRoll.isCritical).toBe(true);
    });

    it('a natural 1 misses even against AC 0', () => {
        const r = resolveD20Attack(ctx(A(), T(0), { manualRoll: 1 }));

        expect(r.isHit).toBe(false);
    });

    it('an AC modifier from the modifiers map raises the defence value', () => {
        const t = T();

        const r = resolveD20Attack(
            ctx(A(), t, {
                manualRoll: 5,
                modifiers: {
                    t: [
                        {
                            kind: 'modifyStat',
                            stat: 'armor',
                            flat: 2,
                        } as unknown as StaticEffect,
                    ],
                },
            })
        );

        expect(r.defenseValue).toBe(16);
        expect(r.isHit).toBe(false);
    });
});

describe('resolveD20Attack flags', () => {
    it('guaranteedHit turns a low roll into a hit but not a natural 1', () => {
        const a = grantPassive(A(), [flag('guaranteedHit')]);

        expect(resolveD20Attack(ctx(a, T(), { manualRoll: 2 })).isHit).toBe(
            true
        );
        expect(resolveD20Attack(ctx(a, T(), { manualRoll: 1 })).isHit).toBe(
            false
        );
    });

    it('autoCritAdjacent on the target makes an adjacent hit critical and logs it', () => {
        const t = grantPassive(T(), [flag('autoCritAdjacent')]);

        const r = resolveD20Attack(ctx(A(), t, { manualRoll: 15 }));

        expect(r.isHit).toBe(true);
        expect(r.attackRoll.isCritical).toBe(true);
        expect(r.lines).toHaveLength(1);
    });

    it('autoCritAdjacent does not crit a miss', () => {
        const t = grantPassive(T(40), [flag('autoCritAdjacent')]);

        const r = resolveD20Attack(ctx(A(), t, { manualRoll: 15 }));

        expect(r.isHit).toBe(false);
        expect(r.attackRoll.isCritical).toBe(false);
    });

    it('critImmunity cancels a natural 20 crit but the attack still hits', () => {
        const t = grantPassive(T(), [flag('critImmunity')]);

        const r = resolveD20Attack(ctx(A(), t, { manualRoll: 20 }));

        expect(r.isHit).toBe(true);
        expect(r.attackRoll.isCritical).toBe(false);
        expect(r.lines).toHaveLength(1);
    });

    it('critImmunity adds no line when there was no crit', () => {
        const t = grantPassive(T(), [flag('critImmunity')]);

        const r = resolveD20Attack(ctx(A(), t, { manualRoll: 12 }));

        expect(r.lines).toHaveLength(0);
    });
});

describe('resolveD20Attack rolls', () => {
    it('advantage keeps the higher die and logs the second roll', () => {
        const r = resolveD20Attack(
            ctx(A(), T(), {
                manualRoll: 4,
                roll: { mode: 'advantage', advantage: 17 },
            })
        );

        expect(r.attackRoll.chosenD20).toBe(17);
        expect(r.lines).toHaveLength(1);
    });

    it('disadvantage keeps the lower die', () => {
        const r = resolveD20Attack(
            ctx(A(), T(), {
                manualRoll: 17,
                roll: { mode: 'disadvantage', disadvantage: 4 },
            })
        );

        expect(r.attackRoll.chosenD20).toBe(4);
        expect(r.isHit).toBe(false);
    });
});

describe('d20AbortedRoll', () => {
    it('returns the roll without a hit decision and uses the manual die', () => {
        const r = d20AbortedRoll(ctx(A(), T(), { manualRoll: 13 }));

        expect(r.chosenD20).toBe(13);
        expect(r.totalAttackValue).toBe(22);
    });

    it('rolls its own die from the rng when no manual roll is given', () => {
        const r = d20AbortedRoll(
            ctx(A(), T(), { manualRoll: undefined, rng: () => 0 })
        );

        expect(r.chosenD20).toBe(1);
        expect(r.isCriticalFail).toBe(true);
    });
});

describe('resolveD20Attack held d20 die', () => {
    const holding = (): BattleParticipant => {
        const a = A();

        return {
            ...a,
            battleData: {
                ...a.battleData,
                activeEffects: [
                    {
                        id: 'insp',
                        name: 'Bardic Inspiration',
                        type: 'buff',
                        duration: 99,
                        appliedAt: { round: 1, timestamp: new Date(0) },
                        effects: [{ type: 'd20Rider', value: 6 }],
                    },
                ],
            },
        };
    };

    const gate = (spend: boolean) =>
        createCritGate({
            rng: () => 0.5,
            riderChoices: spend ? { 'rider:a:attack:0': true } : {},
        });

    it('turns a near miss into a hit when the holder spends the die', () => {
        const g = gate(true);

        const r = resolveD20Attack(
            ctx(holding(), T(), { manualRoll: 3, crit: g.pick })
        );

        // 3 + 9 = 12 vs AC 14, die d6 at 0.5 = +4
        expect(r.isHit).toBe(true);
        expect(r.attackRoll.totalAttackValue).toBe(16);
        expect(r.attackRoll.riderBonus).toBe(4);
        expect(g.spent).toEqual([{ holderId: 'a', effectId: 'insp' }]);
    });

    it('stays a miss and offers the die when the holder keeps it', () => {
        const g = gate(false);

        const r = resolveD20Attack(
            ctx(holding(), T(), { manualRoll: 3, crit: g.pick })
        );

        expect(r.isHit).toBe(false);
        expect(g.offers).toHaveLength(1);
    });

    it('offers nothing on a natural 1 or when the die cannot reach the AC', () => {
        const g = gate(true);

        resolveD20Attack(ctx(holding(), T(), { manualRoll: 1, crit: g.pick }));
        resolveD20Attack(ctx(holding(), T(30), { manualRoll: 3, crit: g.pick }));
        expect(g.offers).toEqual([]);
    });

    it('does nothing without a gate (previews, off-turn flows)', () => {
        const r = resolveD20Attack(ctx(holding(), T(), { manualRoll: 3 }));

        expect(r.isHit).toBe(false);
    });
});
