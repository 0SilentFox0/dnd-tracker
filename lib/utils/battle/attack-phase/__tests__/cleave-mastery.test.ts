import { describe, expect, it } from 'vitest';

import { runAttackPhase } from '../run-attack-phase';

import { AttackType, ParticipantSide } from '@/lib/constants/battle';
import { resolved } from '@/lib/utils/abilities/__tests__/fixtures';
import { placed, testMap } from '@/lib/utils/battle/__tests__/fixtures/placed';
import { markUsedThisTurn } from '@/lib/utils/battle/weapon-mastery/once';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const AXE: BattleAttack = {
    id: 'axe',
    name: 'Greataxe',
    type: AttackType.MELEE,
    attackBonus: 8,
    damageDice: '1d12',
    damageType: 'slashing',
    properties: 'Heavy. Mastery: Cleave',
};

const trained = (kinds: string[]) =>
    resolved({
        trigger: { event: 'passive' },
        params: { weaponMastery: kinds },
        effects: [{ kind: 'note', text: 'Mastery' }],
    });

const barbarian = (kinds: string[]): BattleParticipant => {
    const p = placed('b', {
        side: ParticipantSide.ALLY,
        at: { x: 5, y: 5 },
        abilities: [trained(kinds)],
        attacks: [AXE],
    });

    return {
        ...p,
        abilities: { ...p.abilities, damageModel: '5e' },
        basicInfo: { ...p.basicInfo, controlledBy: 'u1' },
    };
};

const foe = (id: string, x: number, y: number) =>
    placed(id, { at: { x, y }, hp: 100 });

const run = (hero: BattleParticipant) =>
    runAttackPhase({
        battle: {
            initiativeOrder: [hero, foe('e1', 6, 5), foe('e2', 6, 4)],
            currentRound: 1,
            currentTurnIndex: 0,
        },
        data: {
            attackerId: 'b',
            targetId: 'e1',
            attackId: 'axe',
            d20Roll: 15,
            damageRolls: [6],
        },
        battleId: 'b1',
        userId: 'u1',
        isDM: false,
        rules: DEFAULT_RULES,
        map: testMap(),
        rng: () => 0.9,
    });

const strikes = (r: ReturnType<typeof run>) =>
    r.allBattleActions.filter((a) => a.actionType === 'attack').length;

describe('Cleave mastery in the attack phase', () => {
    it('a hit also strikes a second adjacent creature, once per turn', () => {
        const first = run(barbarian(['greataxe']));

        expect(strikes(first)).toBe(2);

        const hero = first.finalInitiativeOrder.find(
            (p) => p.basicInfo.id === 'b'
        ) as BattleParticipant;

        expect(
            strikes(
                run({
                    ...markUsedThisTurn(barbarian(['greataxe']), 'cleave', 1),
                })
            )
        ).toBe(1);
        expect(hero.battleData.activeEffects.map((e) => e.abilityKey)).toContain(
            'mastery:cleave-used'
        );
    });

    it('does nothing without the trained kind', () => {
        expect(strikes(run(barbarian(['longsword'])))).toBe(1);
    });
});
