'use client';

import { useTranslations } from 'next-intl';

import { alignmentLabel } from '@/lib/utils/characters/alignment';

export function useAlignmentLabel() {
    const t = useTranslations('gameTerms');

    return (value: string | null | undefined, form?: 'name' | 'short') =>
        alignmentLabel(value, (key) => t(key), form);
}
