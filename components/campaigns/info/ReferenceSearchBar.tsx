'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

import { SearchInput } from '@/components/common/fields/SearchInput';
import { shortcutBlocked } from '@/lib/hooks/common';
import type { ReferenceFilters } from '@/types/info-reference';

export function ReferenceSearchBar({
    filters,
    found,
}: {
    filters: ReferenceFilters;
    found: number;
}) {
    const t = useTranslations('dashboard.reference');

    const root = useRef<HTMLDivElement>(null);

    const { search, classMode } = filters;

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== '/' || shortcutBlocked(e)) return;

            e.preventDefault();
            root.current?.querySelector('input')?.focus();
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, []);

    return (
        <div
            ref={root}
            onKeyDown={(e) => {
                if (e.key === 'Escape' && search.value) {
                    e.stopPropagation();
                    search.set('');
                }
            }}
            className="flex items-center gap-3"
        >
            <SearchInput
                className="min-w-0 flex-1"
                value={search.value}
                onChange={search.set}
                label={
                    classMode ? t('search.ariaClasses') : t('search.ariaSkills')
                }
                placeholder={t('search.placeholder')}
            />
            <p
                aria-live="polite"
                className="shrink-0 text-sm text-hud-muted tabular-nums"
            >
                {t('list.found', { count: found })}
            </p>
        </div>
    );
}
