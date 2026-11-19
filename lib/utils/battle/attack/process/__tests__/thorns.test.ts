import { describe, expect, it } from 'vitest';

import { AttackType, ParticipantSide } from '@/lib/constants/battle';
import {
    makeParticipant,
    resolved,
    seq,
} from '@/lib/utils/abilities/__tests__/fixtures';
import { applyThorns } from '@/lib/utils/battle/attack/process/thorns';
import type { ActionFlow } from '@/lib/utils/battle/common/action-flow';
import { castSpell } from '@/lib/utils/battle/spell';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const attackOf = (type: AttackType): BattleAttack => ({
    id: 'a',
    name: 'Strike',
    type,
    attackBonus: 5,
    damageDice: '1d6',
    damageType: 'slashing',
});

const ward = (over: { whileTempHp?: boolean; tempHp?: number } = {}) => {
    const p = makeParticipant({
        id: 'd',
        hp: 20,
        maxHp: 20,
        abilities: [
            resolved({
                trigger: { event: 'passive' },
                effects: [
                    {
                        kind: 'flag',
                        flag: 'thorns',
                        damage: 5,
                        damageType: 'cold',
                        attackKinds: ['melee'],
                        ...(over.whileTempHp && { whileTempHp: true }),
                    },
                ],
            }),
        ],
    });

    return {
        ...p,
        combatStats: { ...p.combatStats, tempHp: over.tempHp ?? 0 },
    };
};

const hitter = () =>
    makeParticipant({
        id: 'h',
        side: ParticipantSide.ENEMY,
        hp: 20,
        maxHp: 20,
    });

const flowOf = (ps: BattleParticipant[]): ActionFlow => ({
    ps,
    messages: [],
    summons: [],
    ctx: { round: 1, rng: seq(0.5), rules: DEFAULT_RULES },
});

const run = (
    defender: BattleParticipant,
    type: AttackType,
    tempHpBefore: number
) => {
    const flow = flowOf([defender, hitter()]);

    applyThorns(flow, {
        attackerId: 'h',
        targetId: 'd',
        attack: attackOf(type),
        tempHpBefore,
    });

    return flow.ps.find((p) => p.basicInfo.id === 'h')!.combatStats.currentHp;
};

describe('thorns flag', () => {
    it('damages a melee attacker, not a ranged one', () => {
        expect(run(ward(), AttackType.MELEE, 0)).toBe(15);
        expect(run(ward(), AttackType.RANGED, 0)).toBe(20);
    });

    it('whileTempHp needs temp HP before the hit', () => {
        const defender = ward({ whileTempHp: true, tempHp: 5 });

        expect(run(defender, AttackType.MELEE, 5)).toBe(15);
        expect(run(defender, AttackType.MELEE, 0)).toBe(20);
    });

    it('does nothing without the flag', () => {
        expect(run(makeParticipant({ id: 'd' }), AttackType.MELEE, 3)).toBe(20);
    });
});

describe('Armor of Agathys data shape', () => {
    const casterAt = (slot: number) => {
        const c = makeParticipant({ id: 'c', hp: 20, maxHp: 20 });

        return {
            ...c,
            spellcasting: {
                ...c.spellcasting,
                spellSlots: { [slot]: { max: 1, current: 1 } },
            },
        };
    };

    const spell = {
        id: 'agathys',
        name: 'Armor of Agathys',
        level: 1,
        groupId: null,
        definition: {
            dice: 0,
            cost: 'action' as const,
            targeting: { kind: 'self' as const },
            resolution: { kind: 'auto' as const },
            effects: [
                {
                    kind: 'tempHp' as const,
                    amount: 5,
                    upcastAmount: 5,
                    target: 'self' as const,
                },
                {
                    kind: 'flag' as const,
                    flag: 'thorns' as const,
                    damage: 5,
                    damageType: 'cold',
                    attackKinds: ['melee' as const],
                    whileTempHp: true,
                    upcastDamage: 5,
                    duration: { rounds: 99 },
                },
            ],
            raceModifiers: [],
        },
    };

    const cast = (slot: number) => {
        const caster = casterAt(slot);

        const r = castSpell({
            rules: DEFAULT_RULES,
            caster,
            spell,
            castLevel: slot,
            slotKey: String(slot),
            targetIds: ['c'],
            allParticipants: [caster, hitter()],
            currentRound: 1,
            battleId: 'b',
            diceRolls: [],
            rng: seq(0.5),
        });

        return r.allParticipantsUpdated.find((p) => p.basicInfo.id === 'c')!;
    };

    it.each([
        [1, 5, 5],
        [3, 15, 15],
    ])(
        'slot %i gives %i temp HP and %i cold retaliation',
        (slot, temp, dmg) => {
            const out = cast(slot);

            expect(out.combatStats.tempHp).toBe(temp);

            const flow = flowOf([out, hitter()]);

            applyThorns(flow, {
                attackerId: 'h',
                targetId: 'c',
                attack: attackOf(AttackType.MELEE),
                tempHpBefore: out.combatStats.tempHp,
            });

            expect(
                flow.ps.find((p) => p.basicInfo.id === 'h')!.combatStats
                    .currentHp
            ).toBe(20 - dmg);
        }
    );
});
