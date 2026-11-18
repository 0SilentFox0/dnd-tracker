'use client';

import { useTranslator } from '@/lib/i18n/use-translator';
import { ALL_SECTIONS } from '@/lib/utils/rules/section-registry';

/** Label or description of a rules section: module sections keep theirs in their own namespace */
export function useMechanicText() {
    const t = useTranslator();

    return (key: string, part: 'label' | 'description') => {
        const ns = ALL_SECTIONS[key]?.labels;

        return t(ns ? `${ns}.${part}` : `rules.mechanics.${key}.${part}`);
    };
}
