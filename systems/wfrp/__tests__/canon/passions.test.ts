import { describe, expect, it } from 'vitest';

import { bookExample } from './book-example';

import {
    AttackType,
    CombatStatus,
    ParticipantSide,
} from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import {
    canAttackFromPool,
    spendFromPool,
} from '@/lib/utils/battle/attack/attacks-left';
import { type Ruleset, RulesetSchema } from '@/lib/utils/rules/schema';
import { withStats } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { attackOf } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { WFRP_EFFECT_SCHEMAS } from '@/systems/wfrp/rules/ability-effects';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { assertWfrpAction } from '@/systems/wfrp/rules/combat/assert-action';
import { mitigateWfrpDamage } from '@/systems/wfrp/rules/combat/mitigate';
import { wfrpAbilitiesOf } from '@/systems/wfrp/rules/combat/participant';
import { resolveWfrpAttack } from '@/systems/wfrp/rules/combat/resolve-attack';
import { applyWfrpCondition } from '@/systems/wfrp/rules/conditions/apply';
import { conditionLevel } from '@/systems/wfrp/rules/conditions/levels';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { wfrpState, withWfrpState } from '@/systems/wfrp/rules/state';
import { wfrpResetState } from '@/systems/wfrp/rules/state-parts';
import { trait } from '@/systems/wfrp/rules/traits/__tests__/fixtures';
import { isAfraid } from '@/systems/wfrp/rules/traits/fear';
import { isFrenzied } from '@/systems/wfrp/rules/traits/frenzy';
import {
    hatesTarget,
    inGroup,
    wfrpFrenzyRoundStart,
    wfrpFrenzyTurnStart,
    wfrpPassionsJoin,
    wfrpPassionsRoundStart,
} from '@/systems/wfrp/rules/traits/passions';
import { wfrpPsychology } from '@/systems/wfrp/rules/traits/psychology';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const RULES = { edition: { preset: 'canon5e' } } as unknown as Ruleset;

const FULL_RULES = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const WP40 = {
    ...DEFAULT_CHARACTERISTICS,
    base: { ...DEFAULT_CHARACTERISTICS.base, wp: 40, ws: 40, bs: 40 },
};

const rollOf = (...rolls: number[]) => {
    const queue = [...rolls];

    return () => ((queue.shift() ?? 50) - 1) / 100 + 0.001;
};

const make = (
    id: string,
    side: ParticipantSide,
    effects: unknown[] = [],
    race?: string
): BattleParticipant => {
    const p = makeParticipant({
        id,
        side,
        abilities: effects.length ? [trait(effects, { key: `t-${id}` })] : [],
    });

    return {
        ...p,
        abilities: {
            ...p.abilities,
            ...wfrpAbilitiesOf(WP40),
            ...(race && { race }),
        },
    };
};

const passion = (passion: string, group?: string) => ({
    kind: 'wfrpPassion',
    passion,
    ...(group && { group }),
});

const hero = (...effects: unknown[]) =>
    make('h', ParticipantSide.ALLY, effects);

const goblin = (...effects: unknown[]) =>
    make('goblin', ParticipantSide.ENEMY, effects, 'Goblin');

const find = (ps: BattleParticipant[], id: string) =>
    ps.find((p) => p.basicInfo.id === id) as BattleParticipant;

const frenzied = (p: BattleParticipant) => withWfrpState(p, { frenzy: true });

describe('canon5e Frenzy (p184, p358)', () => {
    bookExample(
        184,
        'a Willpower test passed on the turn starts a Frenzy',
        () => {
            const ps = [hero(passion('frenzy')), goblin()];

            const r = wfrpFrenzyTurnStart(ps, 'h', {
                round: 1,
                rng: rollOf(30),
                rules: RULES,
            });

            expect(isFrenzied(find(r.participants, 'h'))).toBe(true);
            expect(r.messages).toHaveLength(1);
        }
    );

    bookExample(184, 'a failed Willpower test leaves the fighter calm', () => {
        const ps = [hero(passion('frenzy')), goblin()];

        const r = wfrpFrenzyTurnStart(ps, 'h', {
            round: 1,
            rng: rollOf(80),
            rules: RULES,
        });

        expect(r.participants).toBe(ps);
    });

    bookExample(184, 'a Frenzy needs an enemy to fight', () => {
        const dead = {
            ...goblin(),
            combatStats: {
                ...goblin().combatStats,
                status: CombatStatus.DEAD,
            },
        };

        const ps = [hero(passion('frenzy')), dead];

        const r = wfrpFrenzyTurnStart(ps, 'h', {
            round: 1,
            rng: rollOf(30),
            rules: RULES,
        });

        expect(r.participants).toBe(ps);
    });

    bookExample(184, 'a Frenzied fighter is immune to Fear', () => {
        const fear = goblin({
            kind: 'wfrpPsychology',
            psychology: 'fear',
            value: 2,
        });

        const r = wfrpPsychology([frenzied(hero()), fear], {
            round: 1,
            rng: rollOf(90),
            rules: RULES,
        });

        expect(isAfraid(find(r.participants, 'h'))).toBe(false);
        expect(wfrpState(find(r.participants, 'h')).fear).toBeUndefined();
    });

    bookExample(184, 'Frenzy gives one free extra attack each turn', () => {
        const reset = wfrpResetState(frenzied(hero()), 'turn');

        expect(reset.battleData.attacksLeft).toBe(1);
        expect(wfrpResetState(hero(), 'turn').battleData.attacksLeft).toBe(
            undefined
        );

        const free = spendFromPool(reset, [reset]);

        expect(free.actionFlags.hasUsedAction).toBe(false);
        expect(canAttackFromPool(free)).toBe(false);

        const main = spendFromPool(free, [free]);

        expect(main.actionFlags.hasUsedAction).toBe(true);
    });

    bookExample(184, 'Frenzy adds +1 damage to melee attacks only', () => {
        const unit = (id: string) => {
            const p = make(id, ParticipantSide.ALLY);

            return withStats(p, { sb: 0, tb: 0 });
        };

        const mitigate = (type: AttackType, attacker: BattleParticipant) =>
            mitigateWfrpDamage({
                attacker,
                target: unit('t'),
                weapon: 4,
                amount: 5,
                margin: 1,
                location: 'body',
                crit: false,
                rng: () => 0.5,
                rules: WFRP_RULES,
                attack: {
                    id: 'w',
                    name: 'w',
                    type,
                    attackBonus: 0,
                    damageDice: '',
                    damageType: 'physical',
                } as BattleAttack,
            });

        const calm = unit('a');

        expect(mitigate(AttackType.MELEE, calm).amount).toBe(5);
        expect(mitigate(AttackType.MELEE, frenzied(calm)).amount).toBe(6);
        expect(
            mitigate(AttackType.MELEE, frenzied(calm)).steps.map((s) => s.key)
        ).toContain('frenzy');
        expect(mitigate(AttackType.RANGED, frenzied(calm)).amount).toBe(5);
    });

    bookExample(
        184,
        'Stunned ends the Frenzy at once, Fatigued follows',
        () => {
            const stunned = applyWfrpCondition(
                [frenzied(hero(passion('frenzy'))), goblin()],
                'h',
                {
                    key: 'stunned',
                    levels: 1,
                    round: 1,
                    sourceName: 'x',
                    rules: RULES,
                }
            ).participants;

            expect(isFrenzied(find(stunned, 'h'))).toBe(false);

            const r = wfrpFrenzyRoundStart(stunned, { round: 2, rules: RULES });

            expect(wfrpState(find(r.participants, 'h')).frenzy).toBeUndefined();
            expect(conditionLevel(find(r.participants, 'h'), 'fatigued')).toBe(
                1
            );
        }
    );

    bookExample(
        184,
        'Frenzy ends when no foe is left, then the fighter is Fatigued',
        () => {
            const dead = {
                ...goblin(),
                combatStats: {
                    ...goblin().combatStats,
                    status: CombatStatus.DEAD,
                },
            };

            const r = wfrpFrenzyTurnStart([frenzied(hero()), dead], 'h', {
                round: 3,
                rng: rollOf(50),
                rules: RULES,
            });

            expect(isFrenzied(find(r.participants, 'h'))).toBe(false);
            expect(conditionLevel(find(r.participants, 'h'), 'fatigued')).toBe(
                1
            );
        }
    );

    it('does nothing without the canon5e edition', () => {
        const ps = [hero(passion('frenzy')), goblin()];

        const r = wfrpFrenzyTurnStart(ps, 'h', { round: 1, rng: rollOf(30) });

        expect(r.participants).toBe(ps);
    });
});

describe('canon5e Hatred (p184, p358)', () => {
    const ranged = {
        id: 'bow',
        name: 'Bow',
        type: AttackType.RANGED,
    } as unknown as BattleAttack;

    const shoot = (attacker: BattleParticipant) => {
        const target = goblin();

        return attackOf(
            resolveWfrpAttack({
                attacker,
                target,
                attack: ranged,
                participants: [attacker, target],
                rules: FULL_RULES,
                rng: () => 0.5,
                manualRoll: 25,
            }).attackRoll
        );
    };

    bookExample(184, 'Hatred gives +1 SL against its group', () => {
        const hater = shoot(hero(passion('hatred', 'Goblins')));

        const plain = shoot(hero());

        expect(hatesTarget(hero(passion('hatred', 'Goblins')), goblin())).toBe(
            true
        );
        expect((hater?.sl ?? 0) - (plain?.sl ?? 0)).toBe(1);
    });

    bookExample(184, 'Hatred only counts against the named group', () => {
        expect(hatesTarget(hero(passion('hatred', 'Elves')), goblin())).toBe(
            false
        );
    });

    bookExample(184, 'meeting the group asks for a Psychology test', () => {
        const ps = [hero(passion('hatred', 'Goblins')), goblin()];

        const pass = wfrpPassionsJoin(ps, {
            round: 1,
            rng: rollOf(30),
            rules: RULES,
        });

        expect(pass.messages[0]).toMatchObject({
            message: 'battleWfrp.log.passionPass',
        });
        expect(pass.testerIds).toEqual(['h']);

        const fail = wfrpPassionsJoin(ps, {
            round: 1,
            rng: rollOf(80),
            rules: RULES,
        });

        expect(fail.messages[0]).toMatchObject({
            message: 'battleWfrp.log.passionFail',
        });
    });

    bookExample(184, 'the group is tested once per encounter', () => {
        const ps = [hero(passion('hatred', 'Goblins')), goblin()];

        const first = wfrpPassionsJoin(ps, {
            round: 1,
            rng: rollOf(30),
            rules: RULES,
        });

        const again = wfrpPassionsJoin(first.participants, {
            round: 2,
            rng: rollOf(30),
            rules: RULES,
        });

        expect(again.messages).toHaveLength(0);
    });

    bookExample(184, 'Hatred shrugs off Fear but not Terror', () => {
        const fear = goblin({
            kind: 'wfrpPsychology',
            psychology: 'fear',
            value: 2,
        });

        const calm = wfrpPsychology(
            [hero(passion('hatred', 'Goblins')), fear],
            {
                round: 1,
                rng: rollOf(90),
                rules: RULES,
            }
        );

        expect(wfrpState(find(calm.participants, 'h')).fear).toBeUndefined();
        expect(conditionLevel(find(calm.participants, 'h'), 'broken')).toBe(0);

        const terror = goblin({
            kind: 'wfrpPsychology',
            psychology: 'terror',
            value: 2,
        });

        const scared = wfrpPsychology(
            [hero(passion('hatred', 'Goblins')), terror],
            { round: 1, rng: rollOf(90), rules: RULES }
        );

        expect(
            conditionLevel(find(scared.participants, 'h'), 'broken')
        ).toBeGreaterThan(0);
        expect(wfrpState(find(scared.participants, 'h')).fear).toBeUndefined();
    });
});

describe('canon5e Animosity (p183, p356)', () => {
    bookExample(
        183,
        'Animosity asks for a Psychology test on meeting the group',
        () => {
            const ps = [hero(passion('animosity', 'Goblins')), goblin()];

            const r = wfrpPassionsJoin(ps, {
                round: 1,
                rng: rollOf(80),
                rules: RULES,
            });

            expect(r.messages[0]).toMatchObject({
                message: 'battleWfrp.log.passionFail',
            });
        }
    );

    bookExample(183, 'Fear and Terror outweigh Animosity', () => {
        const scary = goblin({
            kind: 'wfrpPsychology',
            psychology: 'fear',
            value: 1,
        });

        const r = wfrpPassionsJoin(
            [hero(passion('animosity', 'Goblins')), scary],
            { round: 1, rng: rollOf(80), rules: RULES }
        );

        expect(r.messages).toHaveLength(0);
    });

    it('is inert without the canon5e edition', () => {
        const ps = [hero(passion('animosity', 'Goblins')), goblin()];

        const r = wfrpPassionsJoin(ps, { round: 1, rng: rollOf(80) });

        expect(r.participants).toBe(ps);
        expect(r.testerIds).toEqual([]);
    });
});

const melee = {
    id: 'sword',
    name: 'Sword',
    type: AttackType.MELEE,
} as unknown as BattleAttack;

const bow = {
    id: 'bow',
    name: 'Bow',
    type: AttackType.RANGED,
} as unknown as BattleAttack;

const attackCtx = (
    actor: BattleParticipant,
    attack: BattleAttack,
    targets: BattleParticipant[],
    participants: BattleParticipant[]
) => ({ kind: 'attack' as const, actor, attack, targets, participants });

describe('canon5e Frenzy restricts actions (p184, p358)', () => {
    bookExample(184, 'a Frenzied fighter may only attack in melee', () => {
        const me = frenzied(hero(passion('frenzy')));

        const foe = goblin();

        expect(() =>
            assertWfrpAction(attackCtx(me, melee, [foe], [me, foe]))
        ).not.toThrow();
        expect(() =>
            assertWfrpAction(attackCtx(me, bow, [foe], [me, foe]))
        ).toThrow();
    });

    bookExample(358, 'a Frenzied creature casts no spells', () => {
        expect(() =>
            assertWfrpAction({
                kind: 'cast',
                actor: frenzied(hero(passion('frenzy'))),
            })
        ).toThrow();
        expect(() =>
            assertWfrpAction({ kind: 'cast', actor: hero() })
        ).not.toThrow();
    });
});

describe('canon5e Hatred compels and is retested (p184)', () => {
    const failJoin = () =>
        wfrpPassionsJoin([hero(passion('hatred', 'Goblins')), goblin()], {
            round: 1,
            rng: rollOf(80),
            rules: RULES,
        });

    bookExample(184, 'a failed Hatred test compels attacking the group', () => {
        const r = failJoin();

        const me = find(r.participants, 'h');

        const other = make('orc', ParticipantSide.ENEMY);

        expect(wfrpState(me).compelled).toBeDefined();
        expect(() =>
            assertWfrpAction(
                attackCtx(me, melee, [other], [...r.participants, other])
            )
        ).toThrow();
        expect(() =>
            assertWfrpAction(
                attackCtx(
                    me,
                    bow,
                    [find(r.participants, 'goblin')],
                    r.participants
                )
            )
        ).not.toThrow();
    });

    bookExample(184, 'a passed Hatred test compels nothing', () => {
        const r = wfrpPassionsJoin(
            [hero(passion('hatred', 'Goblins')), goblin()],
            { round: 1, rng: rollOf(30), rules: RULES }
        );

        expect(wfrpState(find(r.participants, 'h')).compelled).toBeUndefined();
    });

    bookExample(
        184,
        'the hatred is retested at the end of each round after the first',
        () => {
            const ps = failJoin().participants;

            const same = wfrpPassionsRoundStart(ps, {
                round: 2,
                rng: rollOf(30),
                rules: RULES,
            });

            expect(same.messages).toHaveLength(0);

            const rage = wfrpPassionsRoundStart(ps, {
                round: 3,
                rng: rollOf(80),
                rules: RULES,
            });

            expect(
                wfrpState(find(rage.participants, 'h')).compelled
            ).toBeDefined();
            expect(rage.messages).toHaveLength(1);

            const calm = wfrpPassionsRoundStart(ps, {
                round: 3,
                rng: rollOf(30),
                rules: RULES,
            });

            expect(
                wfrpState(find(calm.participants, 'h')).compelled
            ).toBeUndefined();
        }
    );

    bookExample(184, 'the hatred ends once the group is gone', () => {
        const ps = failJoin().participants.filter(
            (p) => p.basicInfo.id !== 'goblin'
        );

        const r = wfrpPassionsRoundStart(ps, {
            round: 2,
            rng: rollOf(80),
            rules: RULES,
        });

        expect(wfrpState(find(r.participants, 'h')).compelled).toBeUndefined();
        expect(r.messages).toHaveLength(0);
    });
});

describe('passion groups and allies', () => {
    const named = (race: string | undefined, name = 'x') => {
        const p = make('g', ParticipantSide.ENEMY, [], race);

        return { ...p, basicInfo: { ...p.basicInfo, name } };
    };

    it('matches whole words of the race, singular or plural', () => {
        expect(inGroup(named('Orc'), 'Orcs')).toBe(true);
        expect(inGroup(named('Elf'), 'Elves')).toBe(true);
        expect(inGroup(named('Elves'), 'Elf')).toBe(true);
        expect(inGroup(named('Goblin'), 'Goblins')).toBe(true);
        expect(inGroup(named('Dark Elf'), 'elves')).toBe(true);
    });

    it('does not match inside a word or by the name', () => {
        expect(inGroup(named('Sorcerer'), 'Orcs')).toBe(false);
        expect(inGroup(named('Human', 'Goblin'), 'Goblins')).toBe(false);
        expect(inGroup(named(undefined, 'Goblin'), 'Goblins')).toBe(false);
    });

    bookExample(184, 'an allied group member starts no test', () => {
        const ally = make('al', ParticipantSide.ALLY, [], 'Goblin');

        const r = wfrpPassionsJoin([hero(passion('hatred', 'Goblins')), ally], {
            round: 1,
            rng: rollOf(80),
            rules: RULES,
        });

        expect(r.messages).toHaveLength(0);
    });

    bookExample(184, 'an allied group member does not compel', () => {
        const me = withWfrpState(hero(passion('hatred', 'Goblins')), {
            compelled: { 'hatred:goblin': { group: 'Goblins', round: 1 } },
        });

        const ally = make('al', ParticipantSide.ALLY, [], 'Goblin');

        const other = make('orc', ParticipantSide.ENEMY, [], 'Orc');

        expect(() =>
            assertWfrpAction(attackCtx(me, melee, [other], [me, ally, other]))
        ).not.toThrow();
    });

    bookExample(184, 'Frenzy overrides the Hatred compulsion', () => {
        const me = withWfrpState(hero(passion('hatred', 'Goblins')), {
            frenzy: true,
            compelled: { 'hatred:goblin': { group: 'Goblins', round: 1 } },
        });

        const other = make('orc', ParticipantSide.ENEMY, [], 'Orc');

        expect(() =>
            assertWfrpAction(
                attackCtx(me, melee, [other], [me, goblin(), other])
            )
        ).not.toThrow();
    });
});

describe('passion effect schema', () => {
    const parse = (e: unknown) =>
        WFRP_EFFECT_SCHEMAS.some((s) => s.safeParse(e).success);

    it('Hatred and Animosity need a group, Frenzy takes none', () => {
        expect(parse(passion('hatred', 'Goblins'))).toBe(true);
        expect(parse(passion('hatred'))).toBe(false);
        expect(parse(passion('animosity', 'Elves'))).toBe(true);
        expect(parse(passion('frenzy'))).toBe(true);
        expect(parse(passion('frenzy', 'Goblins'))).toBe(false);
    });
});
