'use client';

import { useTranslator } from '@/lib/i18n/use-translator';
import { alignmentLabelKey } from '@/lib/utils/characters/alignment';

export function useAlignmentLabel(): (
    value: string | null | undefined,
    form?: 'name' | 'short'
) => string {
    const t = useTranslator('gameTerms');

    return (value, form = 'name') => {
        if (!value) return '';

        const key = alignmentLabelKey(value, form);

        return key && t.has(key) ? t(key) : value;
    };
}
