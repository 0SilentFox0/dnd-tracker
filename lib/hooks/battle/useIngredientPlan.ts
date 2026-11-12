'use client';

import { useMemo } from 'react';

import { useBattleScene } from './useBattleScene';

import { COIN_VALUE } from '@/lib/constants/inventory';
import { useTranslator } from '@/lib/i18n/use-translator';
import { currencyValueOf, ruleSystemOf } from '@/lib/utils/rules/systems';
import { trackedIngredients } from '@/lib/utils/spells/ingredients';
import { planIngredients } from '@/lib/utils/spells/ingredients/plan';
import {
    formatMissing,
    summarizeIngredients,
} from '@/lib/utils/spells/ingredients/summary';
import type { SpellIngredient } from '@/lib/utils/spells/ingredients/types';
import type { BattleParticipant } from '@/types/battle';

export interface IngredientLine {
    need: string;
    missing: string;
    payGp: number;
    blocked: boolean;
    /** the caster chooses whether to spend it (cancels a miscast) */
    optional?: boolean;
    use?: boolean;
}

export function useIngredientPlan(
    caster: BattleParticipant | null,
    spell: { ingredients?: SpellIngredient[] } | null,
    skip: boolean,
    use = false
): IngredientLine | null {
    const t = useTranslator('spells');

    const rules = useBattleScene().battle.rules;

    const rule = rules?.spellIngredients;

    const optional =
        !!rules &&
        ruleSystemOf(rules).magic.tested?.ingredients === 'avertMiscast';

    const stock = caster?.battleData.ingredientStock;

    const list = spell?.ingredients;

    const enabled =
        !skip &&
        !!rule?.enabled &&
        !!stock &&
        trackedIngredients(list ?? []).length > 0;

    const autoPay = !!rule?.autoPay;

    const value = useMemo(
        () => (rules ? currencyValueOf(rules) : COIN_VALUE),
        [rules]
    );

    const plan = useMemo(
        () =>
            enabled && stock && list
                ? planIngredients(list, stock, { autoPay, value })
                : null,
        [enabled, stock, list, autoPay, value]
    );

    if (!plan || !list) return null;

    const need = summarizeIngredients(trackedIngredients(list), {
        minGp: (gp) => t('ingredients.minGpShort', { gp }),
        consumed: t('ingredients.consumedShort'),
    });

    return {
        need,
        missing: formatMissing(plan.missing),
        payGp: plan.spendCp / value.gp,
        blocked: !plan.ok && (!optional || use),
        optional,
        use,
    };
}
