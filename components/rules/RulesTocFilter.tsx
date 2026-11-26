'use client';

import { useTranslations } from 'next-intl';

import { SearchInput } from '@/components/common/fields/SearchInput';

export function RulesTocFilter({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    const t = useTranslations('rules.page');

    return (
        <SearchInput
            value={value}
            onChange={onChange}
            label={t('filter')}
            placeholder={t('filter')}
            className="w-44 sm:w-56"
        />
    );
}
