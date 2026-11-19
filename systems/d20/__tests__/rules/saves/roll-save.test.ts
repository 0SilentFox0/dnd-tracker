import { describe, expect, it } from 'vitest';

import {
    makeEffect,
    makeParticipant,
    seq,
} from '@/lib/utils/abilities/__tests__/fixtures';
import type { StaticEffect } from '@/lib/utils/abilities/schema';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import { rollSave, saveRollMode } from '@/systems/d20/rules/saves/roll-save';
import type { BattleParticipant } from '@/types/battle';

const base = (): BattleParticipant => {
    const p = makeParticipant({ id: 't' });

    return {
        ...p,
        abilities: {
            ...p.abilities,
            proficiencyBonus: 3,
            modifiers: { ...p.abilities.modifiers, dexterity: 2, wisdom: 1 },
        },
    };
};

const withFlag = (
    p: BattleParticipant,
    effect: StaticEffect
): BattleParticipant => ({
    ...p,
    battleData: {
        ...p.battleData,
        activeEffects: [makeEffect('e', { abilityEffects: [effect] })],
    },
});

const run = (
    t: BattleParticipant,
    over: Partial<Parameters<typeof rollSave>[0]> = {}
) =>
    rollSave({
        target: t,
        ability: 'dexterity',
        dc: 12,
        participants: [t],
        rules: DEFAULT_RULES,
        rng: seq(0.5, 0.7),
        ...over,
    });

describe('rollSave', () => {
    it('без прапорців — один кубик, як раніше', () => {
        const r = run(base());

        expect(r).toMatchObject({
            roll: 11,
            rolls: [11],
            mod: 2,
            bonus: 0,
            total: 13,
            success: true,
            mode: 'normal',
            autoFail: false,
        });
    });

    it('autoFailSave — провал без кидка', () => {
        const rng = () => {
            throw new Error('rng used');
        };

        const r = run(
            withFlag(base(), {
                kind: 'flag',
                flag: 'autoFailSave',
                abilities: ['dexterity'],
            }),
            { rng }
        );

        expect(r).toMatchObject({ success: false, autoFail: true, rolls: [] });
    });

    it('перевага бере більший кубик, недолік — менший', () => {
        const adv = run(
            withFlag(base(), {
                kind: 'flag',
                flag: 'saveAdvantage',
                abilities: 'all',
            }),
            { rng: seq(0.1, 0.9) }
        );

        expect(adv).toMatchObject({
            mode: 'advantage',
            rolls: [3, 19],
            roll: 19,
        });

        const dis = run(
            withFlag(base(), {
                kind: 'flag',
                flag: 'saveDisadvantage',
                abilities: ['wisdom'],
            }),
            { ability: 'wisdom', rng: seq(0.1, 0.9) }
        );

        expect(dis).toMatchObject({ mode: 'disadvantage', roll: 3 });
    });

    it('перевага й недолік скасовують одне одного', () => {
        const t = base();

        const both: BattleParticipant = {
            ...t,
            battleData: {
                ...t.battleData,
                activeEffects: [
                    makeEffect('e', {
                        abilityEffects: [
                            {
                                kind: 'flag',
                                flag: 'saveAdvantage',
                                abilities: 'all',
                            },
                            {
                                kind: 'flag',
                                flag: 'saveDisadvantage',
                                abilities: 'all',
                            },
                        ],
                    }),
                ],
            },
        };

        expect(run(both)).toMatchObject({ mode: 'normal', rolls: [11] });
    });

    it('vsSpells діє лише проти заклять', () => {
        const t = withFlag(base(), {
            kind: 'flag',
            flag: 'saveAdvantage',
            abilities: 'all',
            vsSpells: true,
        });

        expect(run(t, { vsSpell: true }).mode).toBe('advantage');
        expect(run(t).mode).toBe('normal');
        expect(
            saveRollMode(t, 'dexterity', [t], { vsSpell: true }).reasons
                .advantage
        ).toHaveLength(1);
    });

    it('presetRoll стає першим кубиком при перевазі', () => {
        const t = withFlag(base(), {
            kind: 'flag',
            flag: 'saveAdvantage',
            abilities: 'all',
        });

        expect(run(t, { presetRoll: 3, rng: seq(0.7) })).toMatchObject({
            rolls: [3, 15],
            roll: 15,
        });
    });

    it('майстерність: за правилами й за прапорцем', () => {
        const hero = {
            ...base(),
            abilities: {
                ...base().abilities,
                saveProficiencies: ['wisdom' as const],
            },
        };

        const on = { ...DEFAULT_RULES, saves: { proficiency: true } };

        expect(run(hero, { ability: 'wisdom', rules: on }).bonus).toBe(3);
        expect(run(hero, { ability: 'wisdom' }).bonus).toBe(0);

        const flagged = withFlag(base(), {
            kind: 'flag',
            flag: 'saveProficiency',
            abilities: ['wisdom'],
        });

        expect(run(flagged, { ability: 'wisdom' }).bonus).toBe(3);
    });

    it('modifyStat savingThrow додає бонус', () => {
        const t = withFlag(base(), {
            kind: 'modifyStat',
            stat: 'savingThrow',
            flat: 2,
        });

        expect(run(t)).toMatchObject({ bonus: 2, total: 15 });
    });
});

describe('rollSave held d20 die', () => {
    const rider = (spend: boolean) => {
        const offered: number[] = [];

        return {
            offered,
            pick: ((i: { total: number }) => {
                offered.push(i.total);

                return spend ? { bonus: 3, die: 6 } : undefined;
            }) as NonNullable<Parameters<typeof rollSave>[0]['rider']>,
        };
    };

    it('adds the die to a failed save it could flip', () => {
        const r = rider(true);

        // roll 11 (0.5) + DEX 2 = 13 vs DC 15
        const out = run(base(), { dc: 15, rider: r.pick });

        expect(r.offered).toEqual([13]);
        expect(out.total).toBe(16);
        expect(out.riderBonus).toBe(3);
        expect(out.success).toBe(true);
    });

    it('does not offer on a natural 1, a passed save or a missing DC', () => {
        const r = rider(true);

        run(base(), { dc: 10, rider: r.pick });
        run(base(), { dc: undefined, rider: r.pick });
        run(base(), { dc: 15, rng: seq(0), rider: r.pick });
        expect(r.offered).toEqual([]);
    });
});
