import { describe, expect, it } from 'vitest';

import { bookExample } from './book-example';

import '@/lib/server/systems/registry';
import { AttackType, EffectMarker } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { slotOf } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { critWoundsOf } from '@/systems/wfrp/rules/combat/critical';
import { fumbleModelOf } from '@/systems/wfrp/rules/combat/fumble';
import { resolveWfrpAttack } from '@/systems/wfrp/rules/combat/resolve-attack';
import { EDITION_PROFILES } from '@/systems/wfrp/rules/edition/profiles';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { ATTACK_SLOT } from '@/systems/wfrp/rules/slots';
import { DEFAULT_TABLES } from '@/systems/wfrp/rules/tables/defaults';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const rulesOf = (preset: 'legacy' | 'canon5e', tables?: object) =>
    RulesetSchema.parse({ ...WFRP_RULES, edition: { preset }, tables });

const canon = rulesOf('canon5e');

const legacy = rulesOf('legacy');

const plain = (slot: 'oops' | 'misfire') =>
    DEFAULT_TABLES[slot].map(({ textKey: _k, ...row }) => ({
        ...row,
        text: row.max.toString(),
    }));

const withOops = rulesOf('canon5e', { oops: plain('oops') });

const weapon = (
    type: AttackType,
    group?: string,
    damageBonus = 0
): BattleAttack =>
    ({
        id: 'w',
        name: 'w',
        type,
        damageDice: '',
        damageBonus,
        system: ATTACK_SLOT.write({
            qualities: [],
            flaws: [],
            hand: 'main',
            ...(group && { group }),
        }),
    }) as unknown as BattleAttack;

const fighter = (id: string): BattleParticipant => {
    const base = makeParticipant({ id, hp: 20, maxHp: 20 });

    return {
        ...base,
        abilities: {
            ...base.abilities,
            system: slotOf(
                {
                    ...DEFAULT_CHARACTERISTICS,
                    base: { ...DEFAULT_CHARACTERISTICS.base, ws: 30, bs: 30 },
                },
                { tb: 3 }
            ),
        },
    };
};

const fraction = (roll: number) => (roll - 0.5) / 100;

const run = (
    rules: typeof canon,
    roll: number,
    {
        type = AttackType.MELEE,
        group,
        oops = 50,
        defender = 5,
        damageBonus,
    }: {
        type?: AttackType;
        group?: string;
        damageBonus?: number;
        oops?: number;
        defender?: number;
    } = {}
) => {
    const attacker = fighter('a');

    const target = fighter('t');

    const rolls = [
        ...(type === AttackType.RANGED ? [] : [fraction(defender)]),
        fraction(oops),
        0.1,
        0.3,
    ];

    const r = resolveWfrpAttack({
        attacker,
        target,
        attack: weapon(type, group, damageBonus),
        participants: [attacker, target],
        rules,
        rng: () => rolls.shift() ?? 0.5,
        manualRoll: roll,
    });

    const after = r.attackerUpdate?.(attacker) ?? attacker;

    return {
        r,
        after,
        hp: after.combatStats.currentHp,
        markers: after.battleData.activeEffects.flatMap((e) =>
            e.effects.map((x) => x.type)
        ),
    };
};

describe('canon: fumble (p165)', () => {
    bookExample(
        165,
        'a failed double drops the weapon: the next Action is lost',
        () => {
            const { markers, hp } = run(canon, 88);

            expect(markers).toContain(EffectMarker.SKIP_ACTION);
            expect(hp).toBe(20);
        }
    );

    bookExample(165, 'a failed test without a double is not a fumble', () => {
        expect(run(canon, 87).markers).toEqual([]);
    });

    bookExample(165, 'a passed double is not a fumble', () => {
        expect(run(canon, 22).markers).toEqual([]);
    });

    bookExample(165, 'ranged tests fumble too', () => {
        expect(run(canon, 88, { type: AttackType.RANGED }).markers).toContain(
            EffectMarker.SKIP_ACTION
        );
    });

    bookExample(
        165,
        'a fumble while winning the opposed test still counts',
        () => {
            const out = run(canon, 88, { defender: 97 });

            expect(out.r.isHit).toBe(true);
            expect(out.markers).toContain(EffectMarker.SKIP_ACTION);
        }
    );

    bookExample(165, 'oops 1-2: lose 1 Wound', () => {
        expect(run(withOops, 88, { oops: 10 }).hp).toBe(19);
    });

    bookExample(
        165,
        'oops 3-4: weapon damage and acting last stay notes',
        () => {
            const out = run(withOops, 88, { oops: 30 });

            expect(out.hp).toBe(20);
            expect(out.markers).toEqual([]);
        }
    );

    bookExample(165, 'oops 5-6: -1 SL on the next Action', () => {
        const { after } = run(withOops, 88, { oops: 50 });

        expect(
            after.battleData.activeEffects.some((e) =>
                e.abilityEffects?.some(
                    (a) =>
                        a.kind === 'modifyStat' &&
                        a.stat === 'attackBonus' &&
                        a.flat === -1
                )
            )
        ).toBe(true);
    });

    bookExample(165, 'oops 7: lose the next Move', () => {
        expect(run(withOops, 88, { oops: 65 }).markers).toContain(
            EffectMarker.IMMOBILIZED
        );
    });

    bookExample(165, 'oops 8: miss the next Action', () => {
        expect(run(withOops, 88, { oops: 75 }).markers).toContain(
            EffectMarker.SKIP_ACTION
        );
    });

    bookExample(165, 'oops 10: stunned when no ally is hit', () => {
        const { after } = run(withOops, 88, { oops: 95 });

        expect(
            after.battleData.activeEffects.some((e) =>
                e.name.includes('stunned')
            )
        ).toBe(true);
    });

    bookExample(
        165,
        'misfire: 99 on a blackpowder weapon rolls the Misfire table',
        () => {
            const out = run(canon, 99, {
                type: AttackType.RANGED,
                group: 'blackpowder',
                oops: 10,
            });

            expect(out.markers).toContain(EffectMarker.SKIP_ACTION);
            expect(out.hp).toBe(20);
        }
    );

    bookExample(165, 'misfire: the explosion hurts the shooter', () => {
        const out = run(canon, 100, {
            type: AttackType.RANGED,
            group: 'engineering',
            oops: 95,
        });

        expect(out.hp).toBeLessThan(20);
    });

    bookExample(165, 'a 99 on a bow is a normal fumble, not a misfire', () => {
        const out = run(canon, 99, {
            type: AttackType.RANGED,
            group: 'bow',
        });

        expect(out.markers).toContain(EffectMarker.SKIP_ACTION);
        expect(out.hp).toBe(20);
    });

    it('legacy edition has no fumble consequences', () => {
        const out = run(legacy, 88);

        expect(out.markers).toEqual([]);
        expect(out.hp).toBe(20);
    });
});

const textOf = (lines: unknown[]) => JSON.stringify(lines);

describe('canon: fumble log and explosion damage (p165)', () => {
    bookExample(
        165,
        'misfire explosion deals a profile weapon Damage bonus',
        () => {
            const out = run(canon, 100, {
                type: AttackType.RANGED,
                group: 'blackpowder',
                oops: 95,
                damageBonus: 7,
            });

            expect(out.hp).toBe(20 - 7);
        }
    );

    it('the shooter wounds are logged', () => {
        const out = run(withOops, 88, { oops: 10 });

        expect(textOf(out.r.lines)).toContain('battleWfrp.log.fumbleWounds');
    });

    it('act-last and weapon-damage results are logged as notes', () => {
        const out = run(withOops, 88, { oops: 30 });

        expect(textOf(out.r.lines)).toContain('battleWfrp.log.fumbleNote');
    });
});

describe('canon: fumble model (p165)', () => {
    it('canon5e defaults to dropping the weapon', () => {
        expect(EDITION_PROFILES.canon5e.fumbleModel).toBe('drop');
    });

    it('an Oops table in the rules switches drop to the table', () => {
        const edition = EDITION_PROFILES.canon5e;

        expect(fumbleModelOf(edition, canon)).toBe('drop');
        expect(fumbleModelOf(edition, withOops)).toBe('oops');
        expect(fumbleModelOf({ fumbleModel: 'oops' }, canon)).toBe('oops');
    });

    it('with the table, an Oops roll is applied instead of the drop', () => {
        const out = run(withOops, 88, { oops: 10 });

        expect(out.hp).toBe(19);
        expect(out.markers).toEqual([]);
    });
});

describe('canon: fumble wounds use damage consequences (p165)', () => {
    bookExample(165, 'P3: oops wounds at 0 HP take a Critical Wound', () => {
        const attacker = {
            ...fighter('a'),
            combatStats: { ...fighter('a').combatStats, currentHp: 0 },
        };

        const target = fighter('t');

        const rolls = [fraction(5), fraction(10), 0.1, 0.3];

        const r = resolveWfrpAttack({
            attacker,
            target,
            attack: weapon(AttackType.MELEE),
            participants: [attacker, target],
            rules: withOops,
            rng: () => rolls.shift() ?? 0.5,
            manualRoll: 88,
        });

        const after = r.attackerUpdate?.(attacker) ?? attacker;

        expect(after.combatStats.currentHp).toBe(0);
        expect(critWoundsOf(after)).toBe(critWoundsOf(attacker) + 1);
    });

    it('P5: legacy details carry no fumble flag', () => {
        const attacker = fighter('a');

        const target = fighter('t');

        const r = resolveWfrpAttack({
            attacker,
            target,
            attack: weapon(AttackType.MELEE),
            participants: [attacker, target],
            rules: legacy,
            rng: () => 0.5,
            manualRoll: 88,
        });

        expect(JSON.stringify(r.attackRoll.system)).not.toContain('"fumble"');
    });
});
