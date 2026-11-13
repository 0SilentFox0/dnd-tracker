import { describe, expect, it } from 'vitest';

import { ParticipantSide } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { castSpell } from '@/lib/utils/battle/spell';
import type {
    CastableSpell,
    CastSpellParams,
} from '@/lib/utils/battle/types/spell-process';
import type {
    SpellDefinition,
    SpellMagic,
} from '@/lib/utils/spells/model/schema';
import { castOf } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { conditionLevel } from '@/systems/wfrp/rules/conditions/levels';
import { caster as wfrpCaster } from '@/systems/wfrp/rules/magic/__tests__/fixtures';
import { FORTUNE_INPUT } from '@/systems/wfrp/rules/percentile/fortune';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { wfrpState, withWfrpState } from '@/systems/wfrp/rules/state';
import type { BattleMapConfig, BattleParticipant } from '@/types/battle';

const map: BattleMapConfig = {
    cols: 40,
    rows: 10,
    background: null,
    opacity: 0.3,
};

const at = (p: BattleParticipant, x: number): BattleParticipant => ({
    ...p,
    battleData: { ...p.battleData, position: { x, y: 5 } },
});

const magicOf = (over: Partial<SpellMagic> = {}): SpellMagic => ({
    cn: 2,
    kind: 'arcane',
    overcast: null,
    ...over,
});

const spellOf = (
    magic: SpellMagic | undefined,
    over: Partial<SpellDefinition> = {}
): CastableSpell => ({
    id: 'sp',
    name: 'Bolt',
    level: 1,
    groupId: null,
    definition: {
        dice: 0,
        cost: 'action',
        targeting: { kind: 'enemy' },
        resolution: { kind: 'auto' },
        effects: [
            {
                kind: 'dealDamage',
                amount: { spellRoll: 100 },
                damageType: 'fire',
                byDistance: [{ maxFeet: 600, dice: '1d6' }],
            },
        ],
        raceModifiers: [],
        ...(magic && { casting: { magic } }),
        ...over,
    } as SpellDefinition,
});

const foe = () =>
    at(
        makeParticipant({
            id: 'f',
            side: ParticipantSide.ENEMY,
            hp: 200,
            maxHp: 200,
        }),
        3
    );

const run = (
    spell: CastableSpell,
    extra: Partial<CastSpellParams> = {},
    caster = at(wfrpCaster(), 0)
) =>
    castSpell({
        rules: WFRP_RULES,
        caster,
        spell,
        targetIds: ['f'],
        allParticipants: [caster, foe()],
        currentRound: 1,
        battleId: 'b',
        diceRolls: [],
        rng: () => 0.4,
        map,
        ...extra,
    });

const hpLost = (r: ReturnType<typeof castSpell>) =>
    200 -
    (r.allParticipantsUpdated.find((p) => p.basicInfo.id === 'f')?.combatStats
        .currentHp ?? 0);

const target = (r: ReturnType<typeof castSpell>) =>
    r.allParticipantsUpdated.find(
        (p) => p.basicInfo.id === 'f'
    ) as BattleParticipant;

describe('castSpell in a percentile magic system', () => {
    it('a passed test applies effects and leaves spell slots alone', () => {
        const caster = at(wfrpCaster(), 0);

        const r = run(
            spellOf(magicOf()),
            { castTest: { roll: 30 } },
            {
                ...caster,
                spellcasting: { ...caster.spellcasting, spellSlots: {} },
            }
        );

        expect(r.success).toBe(true);
        expect(r.fizzled).toBeUndefined();
        expect(hpLost(r)).toBe(3);
        expect(r.casterUpdated.spellcasting.spellSlots).toEqual({});
        expect(castOf(r.battleAction.actionDetails)).toMatchObject({
            roll: 30,
            outcome: 'success',
            cn: 2,
        });
        expect(r.details).toBe(r.battleAction.actionDetails.system);
        expect(r.casterUpdated.actionFlags.hasUsedAction).toBe(true);
    });

    it('a failed test fizzles: no effects, action spent, channelled SL gone', () => {
        const caster = at(wfrpCaster({ channelledSl: 1 }), 0);

        const r = run(
            spellOf(magicOf({ cn: 9 })),
            { castTest: { roll: 60 } },
            caster
        );

        expect(r.success).toBe(true);
        expect(r.fizzled).toBe(true);
        expect(hpLost(r)).toBe(0);
        expect(r.casterUpdated.actionFlags.hasUsedAction).toBe(true);
        expect(wfrpState(r.casterUpdated).channelledSl ?? 0).toBe(0);
        expect(castOf(r.battleAction.actionDetails)?.outcome).toBe('failure');
    });

    it('overcast steps raise the cast level: two extra dice per upcastDice', () => {
        const caster = at(wfrpCaster({ channelledSl: 1 }), 0);

        const plain = run(
            spellOf(magicOf({ overcast: 'dice' })),
            { castTest: { roll: 30 } },
            at(wfrpCaster(), 0)
        );

        const over = run(
            spellOf(magicOf({ overcast: 'dice' }), { upcastDice: 1 }),
            { castTest: { roll: 3 } },
            caster
        );

        expect(castOf(over.battleAction.actionDetails)?.overcastSteps).toBe(2);
        expect(hpLost(plain)).toBe(3);
        expect(hpLost(over)).toBe(9);
        expect(over.battleAction.actionDetails.spellSlotUsed).toBe(3);
    });

    it('overcast adds upcast dice to a spellRoll spell, but not for overcast null or Petty', () => {
        const damage = (magic: Partial<SpellMagic>) =>
            hpLost(
                run(
                    spellOf(magicOf(magic), {
                        dice: 2,
                        upcastDice: 1,
                        effects: [
                            {
                                kind: 'dealDamage',
                                amount: { spellRoll: 100 },
                                damageType: 'fire',
                            },
                        ],
                    } as Partial<SpellDefinition>),
                    {
                        castTest: { roll: 3 },
                        dice: { count: 2, sides: 6 },
                        diceRolls: [3, 3],
                    },
                    at(wfrpCaster({ channelledSl: 1 }), 0)
                )
            );

        expect(damage({ overcast: null })).toBe(6);
        expect(damage({ kind: 'petty', overcast: 'dice' })).toBe(6);
        expect(damage({ overcast: 'dice' })).toBe(12);
    });

    it('overcast targets does not raise the cast level', () => {
        const r = run(
            spellOf(magicOf({ overcast: 'targets' }), { upcastDice: 1 }),
            { castTest: { roll: 3 } },
            at(wfrpCaster({ channelledSl: 1 }), 0)
        );

        expect(hpLost(r)).toBe(3);
    });

    it('the lore attribute lands on the affected targets', () => {
        const r = run(
            spellOf(magicOf({ attribute: { condition: 'ablaze', levels: 1 } })),
            { castTest: { roll: 30 } }
        );

        expect(conditionLevel(target(r), 'ablaze')).toBe(1);
    });

    it('no attribute on a fizzled cast', () => {
        const r = run(
            spellOf(
                magicOf({
                    cn: 9,
                    attribute: { condition: 'ablaze', levels: 1 },
                })
            ),
            { castTest: { roll: 60 } }
        );

        expect(conditionLevel(target(r), 'ablaze')).toBe(0);
    });

    it('doubles on a failed test also cost a miscast', () => {
        const r = run(spellOf(magicOf()), {
            castTest: { roll: 77 },
            rng: () => 0.1,
        });

        expect(r.fizzled).toBe(true);
        expect(castOf(r.battleAction.actionDetails)?.miscast).toBe('minor');
        expect(conditionLevel(r.casterUpdated, 'fatigued')).toBe(1);
    });

    it('a DM cast skips the test', () => {
        const r = run(spellOf(undefined), { isDMCast: true });

        expect(r.details).toBeUndefined();
        expect(hpLost(r)).toBe(3);
    });

    it('a save-resolution spell does not fit and spends nothing', () => {
        const r = run(
            spellOf(magicOf(), {
                resolution: {
                    kind: 'save',
                    ability: 'dexterity',
                    onSuccess: 'half',
                },
            }),
            { castTest: { roll: 30 } }
        );

        expect(r.success).toBe(false);
        expect(r.reason).toBe('systemMismatch');
        expect(r.casterUpdated.actionFlags.hasUsedAction).toBe(false);
    });

    it('a spell without magic data does not fit either', () => {
        expect(run(spellOf(undefined), { castTest: { roll: 30 } }).reason).toBe(
            'systemMismatch'
        );
    });

    it('a dry run rolls no test and spends nothing it reports', () => {
        const r = run(spellOf(magicOf({ cn: 9 })), { dryRun: true });

        expect(r.details).toBeUndefined();
        expect(r.fizzled).toBeUndefined();
    });

    it('a Fortune reroll is paid for', () => {
        const caster = at(withWfrpState(wfrpCaster(), { fortune: 2 }), 0);

        const r = run(
            spellOf(magicOf()),
            {
                castTest: {
                    roll: 90,
                    system: FORTUNE_INPUT.write({
                        kind: 'reroll',
                        manualReroll: 30,
                    }),
                },
            },
            caster
        );

        expect(r.fizzled).toBeUndefined();
        expect(castOf(r.battleAction.actionDetails)?.fortune).toMatchObject({
            kind: 'reroll',
            firstRoll: 90,
        });
        expect(wfrpState(r.casterUpdated).fortune).toBe(1);
    });
});

describe('prayers in castSpell', () => {
    it('a prayer keeps banked SL, and doubles at or under Sin bring wrath', () => {
        const caster = at(wfrpCaster({ channelledSl: 2, sin: 3 }), 0);

        const r = run(
            spellOf(magicOf({ kind: 'blessing', cn: 0 })),
            { castTest: { roll: 22 } },
            caster
        );

        expect(wfrpState(r.casterUpdated).channelledSl).toBe(2);
        expect(castOf(r.battleAction.actionDetails)?.miscast).toBe('wrath');
        expect(wfrpState(r.casterUpdated).sin).toBe(3);
        expect(
            r.messages.some(
                (m) =>
                    typeof m !== 'string' && m.message === 'wfrpMagic.log.wrath'
            )
        ).toBe(true);
    });
});

describe('ingredients avert a miscast', () => {
    it('does not cancel divine wrath', () => {
        const caster = at(wfrpCaster({ channelledSl: 2, sin: 3 }), 0);

        const r = run(
            spellOf(magicOf({ kind: 'blessing', cn: 0 })),
            { castTest: { roll: 22 }, ingredientUsed: true },
            caster
        );

        expect(castOf(r.battleAction.actionDetails)?.miscast).toBe('wrath');
    });

    it('cancels the miscast and logs it', () => {
        const r = run(spellOf(magicOf({ cn: 9 })), {
            castTest: { roll: 77 },
            ingredientUsed: true,
        });

        expect(castOf(r.battleAction.actionDetails)?.miscast).toBeNull();
        expect(
            r.messages.some(
                (m) =>
                    typeof m !== 'string' &&
                    m.message === 'wfrpMagic.log.ingredientAverts'
            )
        ).toBe(true);
        expect(
            conditionLevel(r.casterUpdated, 'fatigued') +
                conditionLevel(r.casterUpdated, 'deafened') +
                conditionLevel(r.casterUpdated, 'stunned') +
                conditionLevel(r.casterUpdated, 'blinded')
        ).toBe(0);
        expect(r.casterUpdated.combatStats.currentHp).toBe(20);
    });

    it('logs nothing when there was no miscast', () => {
        const r = run(spellOf(magicOf()), {
            castTest: { roll: 30 },
            ingredientUsed: true,
        });

        expect(
            r.messages.some(
                (m) =>
                    typeof m !== 'string' &&
                    m.message === 'wfrpMagic.log.ingredientAverts'
            )
        ).toBe(false);
    });
});
