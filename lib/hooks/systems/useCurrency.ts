'use client';

import { useMemo } from 'react';

import { useRuleSystem } from './useRuleSystem';

import { type Coin, DEFAULT_CURRENCY } from '@/lib/constants/inventory';
import { useTranslator } from '@/lib/i18n/use-translator';

export interface CurrencyView {
    value: Record<Coin, number>;
    label: (coin: Coin) => string;
}

export function useCurrency(campaignId: string): CurrencyView {
    const t = useTranslator();

    const { system } = useRuleSystem({ campaignId });

    const currency = system?.currency ?? DEFAULT_CURRENCY;

    return useMemo(
        () => ({
            value: currency.value,
            label: (coin) => t(currency.labelKeys[coin]),
        }),
        [currency, t]
    );
}
