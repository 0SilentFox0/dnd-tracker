'use client';

import { useTranslations } from 'next-intl';

import type { FormFieldProps } from '@/components/systems/types';
import { LabeledInput } from '@/components/ui/labeled-input';

export function MoraleField({
    combatStats: { data, set },
    rules,
}: FormFieldProps) {
    const tc = useTranslations('gameTerms.stats');

    const { enabled, cap } = rules.morale;

    if (!enabled) return null;

    return (
        <LabeledInput
            id="morale"
            label={tc('moral')}
            labelClassName="text-xs leading-tight"
            type="number"
            min={-cap}
            max={cap}
            value={data.morale}
            onChange={(e) => set('morale', parseInt(e.target.value) || 0)}
            containerClassName="w-full min-w-0"
            className="w-full"
        />
    );
}
