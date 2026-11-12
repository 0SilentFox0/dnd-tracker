import { describe, expect, it } from 'vitest';

import {
    makeEffect,
    makeParticipant,
    seq,
} from '@/lib/utils/abilities/__tests__/fixtures';
import { savesOf } from '@/lib/utils/battle/saves/access';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { evasionFactor, hasEvasion } from '@/systems/d20/rules/saves/evasion';
import { resolveSave } from '@/systems/d20/rules/saves/legendary';
import { bestSaveAbility, rollSave } from '@/systems/d20/rules/saves/roll-save';
import { rollSaveEnds } from '@/systems/d20/rules/saves/save-ends';

const target = () => {
    const p = makeParticipant({ id: 't' });

    return {
        ...p,
        abilities: {
            ...p.abilities,
            proficiencyBonus: 3,
            modifiers: { ...p.abilities.modifiers, dexterity: 2, strength: 4 },
        },
        battleData: {
            ...p.battleData,
            legendary: { resistLeft: 1, actions: 3, actionsLeft: 3 },
        },
    };
};

describe('combat.saves of a d20 base is the same as the direct calls', () => {
    const saves = savesOf(DEFAULT_RULES);

    it('roll', () => {
        const t = target();

        const input = {
            target: t,
            ability: 'dexterity' as const,
            dc: 12,
            participants: [t],
            rules: DEFAULT_RULES,
            rng: seq(0.1, 0.9),
            vsSpell: true,
        };

        expect(saves.roll({ ...input, rng: seq(0.1, 0.9) })).toEqual(
            rollSave({ ...input, rng: seq(0.1, 0.9) })
        );
    });

    it('resolve, bestAbility, evasion', () => {
        const t = target();

        const failed = { success: false };

        expect(saves.resolve(t, failed)).toEqual(resolveSave(t, failed));
        expect(
            saves.bestAbility(t, ['dexterity', 'strength'], [t], DEFAULT_RULES)
        ).toBe(
            bestSaveAbility(t, ['dexterity', 'strength'], [t], DEFAULT_RULES)
        );
        expect(saves.evasion.has([t], t)).toBe(hasEvasion([t], t));
        expect([true, false].map((s) => saves.evasion.factor(s, true))).toEqual(
            [true, false].map((s) => evasionFactor(s, true))
        );
    });

    it('rollEnds', () => {
        const t = {
            ...target(),
            battleData: {
                ...target().battleData,
                activeEffects: [
                    makeEffect('e', {
                        saveEnds: { ability: 'wisdom', dc: 10 },
                    }),
                ],
            },
        };

        expect(saves.rollEnds(t, [t], DEFAULT_RULES, seq(0.7))).toEqual(
            rollSaveEnds(t, [t], DEFAULT_RULES, seq(0.7))
        );
    });
});
