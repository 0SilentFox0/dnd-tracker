'use client';

import { useTranslations } from 'next-intl';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OPS_RANGES } from '@/lib/schemas/ops';
import type { OpsRange } from '@/types/ops';

export function OpsRangeTabs({
    value,
    onChange,
}: {
    value: OpsRange;
    onChange: (range: OpsRange) => void;
}) {
    const t = useTranslations('ops.ranges');

    return (
        <Tabs value={value} onValueChange={(v) => onChange(v as OpsRange)}>
            <TabsList aria-label={t('label')}>
                {OPS_RANGES.map((range) => (
                    <TabsTrigger key={range} value={range}>
                        {t(range)}
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
    );
}
