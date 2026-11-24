'use client';

import { useTranslations } from 'next-intl';

import { HudChipTabs } from '@/components/hud/page/HudChipTabs';
import { LOG_FILTERS, type LogFilter } from '@/lib/utils/battle/view';

export function LogFilterBar({
    value,
    onChange,
}: {
    value: LogFilter;
    onChange: (filter: LogFilter) => void;
}) {
    const t = useTranslations('battle.log');

    return (
        <HudChipTabs
            ariaLabel={t('filters')}
            items={LOG_FILTERS.map((key) => ({
                key,
                label: t(`filter.${key}`),
                active: value === key,
                onSelect: () => onChange(key),
            }))}
        />
    );
}
