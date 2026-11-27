'use client';

import { useTranslations } from 'next-intl';

import { LanternSearch } from '@/components/common/illustrations';
import { EmptyState } from '@/components/common/states';
import { Button } from '@/components/ui/button';

export function SearchEmptyState({
    query,
    onClear,
}: {
    query: string;
    onClear: () => void;
}) {
    const t = useTranslations('common.search');

    return (
        <EmptyState
            illustration={<LanternSearch />}
            title={t('noResults', { query: query.trim() })}
            action={
                <Button variant="outline" onClick={onClear}>
                    {t('clear')}
                </Button>
            }
        />
    );
}
