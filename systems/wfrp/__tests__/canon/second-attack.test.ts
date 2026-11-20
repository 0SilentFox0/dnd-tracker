import { describe, expect, it } from 'vitest';

import { bookExample } from './book-example';

import { AttackType } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { slotOf } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { OFFHAND_SL_PENALTY } from '@/systems/wfrp/rules/combat/constants';
import { wfrpAttackBlocked } from '@/systems/wfrp/rules/combat/disarm';
import {
    grantSecondAttack,
    secondAttackBlocker,
    withMomentum,
} from '@/systems/wfrp/rules/combat/momentum';
import { resolveWfrpAttack } from '@/systems/wfrp/rules/combat/resolve-attack';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import {
    ACTION_SLOT,
    ATTACK_SLOT,
    type WfrpHand,
} from '@/systems/wfrp/rules/slots';
import { wfrpState, withWfrpState } from '@/systems/wfrp/rules/state';
import {
    wfrpEndTurnState,
    wfrpResetState,
} from '@/systems/wfrp/rules/state-parts';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const canon = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const legacy = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'legacy' },
});

const weapon = (
    id: string,
    hand: WfrpHand | undefined,
    type: AttackType = AttackType.MELEE
): BattleAttack =>
    ({
        id,
        name: id,
        type,
        system: ATTACK_SLOT.write({
            qualities: [],
            flaws: [],
            ...(hand && { hand }),
        }),
    }) as unknown as BattleAttack;

const fighter = (
    id: string,
    attacks: BattleAttack[] = []
): BattleParticipant => {
    const base = makeParticipant({ id, hp: 20, maxHp: 20 });

    return {
        ...base,
        abilities: {
            ...base.abilities,
            system: slotOf({
                ...DEFAULT_CHARACTERISTICS,
                base: { ...DEFAULT_CHARACTERISTICS.base, ws: 40, bs: 40 },
            }),
        },
        actionFlags: { ...base.actionFlags, hasUsedAction: true },
        battleData: { ...base.battleData, attacks },
    };
};

const swordAndDagger = [weapon('sword', 'main'), weapon('dagger', 'off')];

const heroWith = (lastHand?: WfrpHand | 'cast', attacks = swordAndDagger) =>
    withMomentum(withWfrpState(fighter('h', attacks), { lastHand }), true);

describe('canon: attack with the other hand (p167)', () => {
    bookExample(167, 'the other hand of the last attack is allowed', () => {
        expect(secondAttackBlocker(heroWith('main'), canon)).toBeNull();
        expect(secondAttackBlocker(heroWith('off'), canon)).toBeNull();
    });

    bookExample(167, 'no weapon in the other hand blocks it', () => {
        expect(
            secondAttackBlocker(
                heroWith('main', [weapon('a', 'main'), weapon('b', 'main')]),
                canon
            )
        ).toBe('weapons');
    });

    bookExample(167, 'a spell as the first action blocks it', () => {
        expect(secondAttackBlocker(heroWith('cast'), canon)).toBe('cast');
    });

    it('a ranged weapon in the other hand does not count', () => {
        expect(
            secondAttackBlocker(
                heroWith('main', [
                    weapon('sword', 'main'),
                    weapon('bow', 'off', AttackType.RANGED),
                ]),
                canon
            )
        ).toBe('weapons');
    });

    bookExample(167, 'the extra attack is added to the attack pool', () => {
        const base = heroWith('main');

        const pooled = {
            ...base,
            battleData: { ...base.battleData, attacksLeft: 2 },
        };

        expect(grantSecondAttack(pooled).battleData.attacksLeft).toBe(3);
        expect(grantSecondAttack(base).battleData.attacksLeft).toBe(1);
    });

    bookExample(
        167,
        'after the grant the hand of the first attack is closed',
        () => {
            const granted = grantSecondAttack(heroWith('main'));

            expect(wfrpAttackBlocked(granted, swordAndDagger[0], canon)).toBe(
                true
            );
            expect(wfrpAttackBlocked(granted, swordAndDagger[1], canon)).toBe(
                false
            );
            expect(wfrpAttackBlocked(granted, swordAndDagger[0], legacy)).toBe(
                false
            );
        }
    );

    bookExample(167, 'only one extra attack per turn', () => {
        expect(
            secondAttackBlocker(
                withMomentum(grantSecondAttack(heroWith('main')), true),
                canon
            )
        ).toBe('used');
    });

    it('lastHand is cleared on turn start', () => {
        const reset = wfrpResetState(heroWith('off'), 'turn');

        expect(wfrpState(reset).lastHand).toBeUndefined();
    });

    it('the slot reader accepts the legacy hand flags', () => {
        const read = (raw: object) =>
            ATTACK_SLOT.read({
                key: 'wfrp',
                data: { qualities: [], flaws: [], ...raw },
            })?.hand;

        expect(read({ hand: true })).toBe('main');
        expect(read({ hand: true, offHand: true })).toBe('off');
        expect(read({ hand: 'off' })).toBe('off');
        expect(read({})).toBeUndefined();
    });
});

describe('canon: off-hand attack, -2 SL (p167)', () => {
    const run = (hand: WfrpHand, rules: typeof canon, type: AttackType) => {
        const attacker = fighter('a');

        const target = fighter('t');

        const r = resolveWfrpAttack({
            attacker,
            target,
            attack: weapon('w', hand, type),
            participants: [attacker, target],
            rules,
            rng: () => 0.5,
            manualRoll: 5,
        });

        return {
            sl: ACTION_SLOT.read(r.attackRoll.system)?.attack?.sl ?? 0,
            hand: wfrpState(r.attackerUpdate?.(attacker) ?? attacker).lastHand,
        };
    };

    for (const type of [AttackType.MELEE, AttackType.RANGED]) {
        bookExample(
            167,
            `${type}: off hand costs ${OFFHAND_SL_PENALTY} SL`,
            () => {
                const main = run('main', canon, type);

                const off = run('off', canon, type);

                expect(main.sl - off.sl).toBe(OFFHAND_SL_PENALTY);
                expect(main.hand).toBe('main');
                expect(off.hand).toBe('off');
            }
        );
    }

    it('legacy has no off-hand penalty and does not track the hand', () => {
        const off = run('off', legacy, AttackType.RANGED);

        expect(off.sl).toBe(run('main', legacy, AttackType.RANGED).sl);
        expect(off.hand).toBeUndefined();
    });
});

describe('canon: second attack needs a known first hand (p167)', () => {
    bookExample(
        167,
        'P1: no recorded hand (Sprint, Disengage, channel) blocks it',
        () => {
            expect(secondAttackBlocker(heroWith(undefined), canon)).toBe(
                'action'
            );
        }
    );
});

describe('canon: owner-turn state is cleared at turn end (p164, p167)', () => {
    it('P7: end of turn drops same-hand, last hand and move mode', () => {
        const p = withWfrpState(heroWith('main'), {
            momentumAttack: true,
            moveMode: 'charge',
        });

        const out = wfrpEndTurnState({
            participants: [p],
            id: 'h',
            round: 1,
            rng: () => 0.5,
            rules: canon,
        });

        const state = wfrpState(out.participants[0]);

        expect(state.momentumAttack).toBeUndefined();
        expect(state.lastHand).toBeUndefined();
        expect(state.moveMode).toBeUndefined();
    });

    it('P7: legacy end of turn changes nothing', () => {
        const p = withWfrpState(heroWith('main'), { moveMode: 'run' });

        const out = wfrpEndTurnState({
            participants: [p],
            id: 'h',
            round: 1,
            rng: () => 0.5,
            rules: legacy,
        });

        expect(out.participants[0]).toBe(p);
    });
});
