import { describe, expect } from 'vitest';

import { bookExample, CANON } from './book-example';

import { ParticipantSide } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { withStats } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { collectAttackMods } from '@/systems/wfrp/rules/combat/attack-mods';
import { isOutnumbering } from '@/systems/wfrp/rules/combat/engagement';
import { withWfrpState } from '@/systems/wfrp/rules/state';
import type { TraitSize } from '@/systems/wfrp/rules/trait-kinds';
import { outnumberWeight } from '@/systems/wfrp/rules/traits/size';
import type { BattleParticipant } from '@/types/battle';

const at = (
    id: string,
    side: 'ally' | 'enemy',
    size: TraitSize,
    x: number,
    y: number
): BattleParticipant => {
    const p = makeParticipant({ id, hp: 10, maxHp: 10 });

    return withStats(
        {
            ...p,
            basicInfo: { ...p.basicInfo, side },
            battleData: { ...p.battleData, position: { x, y } },
        },
        { size }
    );
};

const ring = (
    n: number,
    size: TraitSize,
    side: 'ally' | 'enemy'
): BattleParticipant[] =>
    [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
    ]
        .slice(0, n)
        .map(([x, y], i) => at(`${side}${i}`, side, size, x, y));

const outnumbers = (
    attackers: BattleParticipant[],
    target: BattleParticipant
): boolean =>
    isOutnumbering(attackers[0], target, [...attackers, target], null, true);

describe('canon: weighted outnumbering (p166, p360)', () => {
    const human = at('h', ParticipantSide.ENEMY, 'average', 0, 0);

    const ogre = at('g', ParticipantSide.ENEMY, 'large', 0, 0);

    bookExample(
        360,
        'weights are 1, 1, 2, 3, 4 from Small to Monstrous',
        () => {
            expect(
                (
                    [
                        'small',
                        'average',
                        'large',
                        'enormous',
                        'monstrous',
                    ] as const
                ).map((s) => outnumberWeight(at('x', 'ally', s, 0, 0)))
            ).toEqual([1, 1, 2, 3, 4]);
        }
    );

    bookExample(
        360,
        'two Large against an Average fighter outnumber it',
        () => {
            expect(
                outnumbers(ring(2, 'large', ParticipantSide.ALLY), human)
            ).toBe(true);
        }
    );

    bookExample(360, 'three Average against a Large fighter do not', () => {
        expect(outnumbers(ring(3, 'average', ParticipantSide.ALLY), ogre)).toBe(
            false
        );
    });

    bookExample(360, 'four Average against a Large fighter do', () => {
        expect(outnumbers(ring(4, 'average', ParticipantSide.ALLY), ogre)).toBe(
            true
        );
    });

    bookExample(360, 'four Large against a Monstrous fighter do', () => {
        const giant = at('m', ParticipantSide.ENEMY, 'monstrous', 0, 0);

        expect(outnumbers(ring(4, 'large', ParticipantSide.ALLY), giant)).toBe(
            true
        );
    });

    bookExample(
        360,
        'a Large attacker counts at most as much as its target',
        () => {
            const attackers = ring(2, 'large', ParticipantSide.ALLY);

            expect(
                isOutnumbering(
                    attackers[0],
                    human,
                    [...attackers, human],
                    null,
                    false
                )
            ).toBe(true);
            expect(
                outnumbers(ring(1, 'large', ParticipantSide.ALLY), human)
            ).toBe(false);
        }
    );
});

describe('canon: Outnumbered and Surrounded are SL on the attack test (p166)', () => {
    const modsAgainst = (
        target: BattleParticipant,
        attackers: BattleParticipant[]
    ) =>
        collectAttackMods({
            ctx: {
                attacker: attackers[0],
                target,
                participants: [
                    ...attackers.map((a) =>
                        withWfrpState(a, {
                            engagedWith: { [target.basicInfo.id]: 2 },
                        })
                    ),
                    target,
                ],
                map: null,
                attack: {},
            } as never,
            edition: CANON,
            kind: 'melee',
        });

    bookExample(166, 'Surrounded gives +2 SL, not +3 with Outnumbered', () => {
        const target = at('t', ParticipantSide.ENEMY, 'average', 0, 0);

        const r = modsAgainst(target, ring(3, 'average', ParticipantSide.ALLY));

        expect(r.sl).toBe(2);
        expect(r.mods.map((m) => m.key)).toEqual(['surrounded']);
    });

    bookExample(166, 'Outnumbered gives +1 SL', () => {
        const target = at('t', ParticipantSide.ENEMY, 'average', 0, 0);

        const r = modsAgainst(target, ring(2, 'average', ParticipantSide.ALLY));

        expect(r.sl).toBe(1);
        expect(r.mods.map((m) => m.key)).toEqual(['outnumbered']);
    });

    bookExample(166, 'a lone attacker gets no bonus and no Advantage', () => {
        const target = at('t', ParticipantSide.ENEMY, 'average', 0, 0);

        const r = modsAgainst(target, ring(1, 'average', ParticipantSide.ALLY));

        expect(r).toEqual({ sl: 0, advantage: 0, disadvantage: 0, mods: [] });
    });

    bookExample(
        166,
        'the defender test is untouched: the SL belongs to the attack only',
        () => {
            const target = at('t', ParticipantSide.ENEMY, 'average', 0, 0);

            const [attacker, ...rest] = ring(
                3,
                'average',
                ParticipantSide.ALLY
            );

            const asAttacker = collectAttackMods({
                ctx: {
                    attacker: target,
                    target: attacker,
                    participants: [attacker, ...rest, target],
                    map: null,
                    attack: {},
                } as never,
                edition: CANON,
                kind: 'melee',
            });

            expect(asAttacker.sl).toBe(0);
        }
    );
});

describe('canon: outnumbering cap is the heaviest defender (owner decision)', () => {
    bookExample(
        360,
        'Large attackers count in full against a side holding a Large fighter',
        () => {
            const human = at('h', ParticipantSide.ENEMY, 'average', 0, 0);

            const ogre = at('o', ParticipantSide.ENEMY, 'large', 2, 0);

            const attackers = ring(4, 'large', ParticipantSide.ALLY);

            expect(
                isOutnumbering(
                    attackers[0],
                    human,
                    [...attackers, human, ogre],
                    null,
                    true
                )
            ).toBe(true);
            expect(
                isOutnumbering(
                    attackers[0],
                    human,
                    [...attackers.slice(0, 2), human, ogre],
                    null,
                    true
                )
            ).toBe(false);
        }
    );
});
