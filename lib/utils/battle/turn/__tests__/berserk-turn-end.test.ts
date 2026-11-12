import { describe, expect, it } from 'vitest';

import { runBerserkTurn } from '../berserk';

import { fireWave } from '@/data/library/unit-abilities';
import { AttackType, ParticipantSide } from '@/lib/constants/battle';
import {
    makeEffect,
    makeParticipant,
    resolved,
    seq,
} from '@/lib/utils/abilities/__tests__/fixtures';
import { placed, testMap } from '@/lib/utils/battle/__tests__/fixtures/placed';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { attackOf } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { wfrpAbilitiesOf } from '@/systems/wfrp/rules/combat/participant';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';

const lastTurnEffect = makeEffect('adv', {
    duration: 1,
    expireAtTurnEnd: true,
    armed: true,
});

describe('berserk turn end', () => {
    it('expires turn-end effects of the berserker like a normal turn end', () => {
        const p = makeParticipant({ id: 'b' });

        const berserker = {
            ...p,
            battleData: { ...p.battleData, activeEffects: [lastTurnEffect] },
        };

        const r = runBerserkTurn({
            rules: DEFAULT_RULES,
            participants: [berserker],
            restrictedBy: berserker,
            participantId: 'b',
            bonusPercent: 50,
            round: 1,
            battleId: 'x',
            actionIndex: 0,
            rng: seq(0.5),
        });

        expect(r.participants[0].battleData.activeEffects).toEqual([]);
    });
});

describe('berserk with fire wave on a map', () => {
    const wave = resolved(fireWave());

    const at = (
        id: string,
        x: number,
        y: number,
        side: ParticipantSide,
        abilities: ReturnType<typeof resolved>[] = []
    ) => placed(id, { side, at: { x, y }, hp: 300, abilities });

    it('burns only enemies in the cone behind the victim', () => {
        const berserker = at('b', 4, 5, ParticipantSide.ALLY, [wave]);

        const ps = [
            berserker,
            at('v', 5, 5, ParticipantSide.ENEMY),
            at('near', 6, 5, ParticipantSide.ENEMY),
            at('far', 5, 9, ParticipantSide.ENEMY),
        ];

        const map = testMap();

        const r = runBerserkTurn({
            rules: DEFAULT_RULES,
            participants: ps,
            restrictedBy: berserker,
            participantId: 'b',
            bonusPercent: 0,
            round: 1,
            battleId: 'x',
            actionIndex: 0,
            rng: seq(0, 0.95, 0.5),
            map,
        });

        const hp = (id: string) =>
            r.participants.find((p) => p.basicInfo.id === id)?.combatStats
                .currentHp;

        expect(hp('v')).toBeLessThan(300);
        expect(hp('near')).toBeLessThan(300);
        expect(hp('far')).toBe(300);
    });
});

describe('berserk dice', () => {
    it('удар Шалу не пише diceRolls (кубики не грають)', () => {
        const berserker = makeParticipant({ id: 'b' });

        const victim = makeParticipant({
            id: 'v',
            side: ParticipantSide.ENEMY,
            hp: 100,
            maxHp: 100,
        });

        const r = runBerserkTurn({
            rules: DEFAULT_RULES,
            participants: [berserker, victim],
            restrictedBy: berserker,
            participantId: 'b',
            bonusPercent: 0,
            round: 1,
            battleId: 'x',
            actionIndex: 0,
            rng: seq(0.5),
        });

        expect(r.actions[0].actionDetails.diceRolls).toBeUndefined();
    });
});

describe('berserk on a d100 system', () => {
    it('rolls the percentile attack on the system die', () => {
        const wfrp = (id: string, side: ParticipantSide) => {
            const base = makeParticipant({ id, side, hp: 20, maxHp: 20 });

            return {
                ...base,
                abilities: {
                    ...base.abilities,
                    ...wfrpAbilitiesOf(DEFAULT_CHARACTERISTICS, {
                        ap: { head: 0, arm: 0, body: 0, leg: 0 },
                    }),
                },
                battleData: {
                    ...base.battleData,
                    attacks: [
                        {
                            id: 'sw',
                            name: 'Sword',
                            type: AttackType.MELEE,
                            attackBonus: 0,
                            damageDice: '1d6',
                            damageType: 'slashing',
                        },
                    ],
                },
            };
        };

        const berserker = wfrp('b', ParticipantSide.ALLY);

        const r = runBerserkTurn({
            rules: WFRP_RULES,
            participants: [berserker, wfrp('v', ParticipantSide.ENEMY)],
            restrictedBy: berserker,
            participantId: 'b',
            bonusPercent: 0,
            round: 1,
            battleId: 'x',
            actionIndex: 0,
            rng: seq(0.795),
        });

        expect(attackOf(r.actions[0].actionDetails)?.roll).toBe(80);
    });
});
