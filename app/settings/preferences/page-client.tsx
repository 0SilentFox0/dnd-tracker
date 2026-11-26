'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { LocaleSwitcher } from '@/components/common/shell/LocaleSwitcher';
import { HudFormPage, HudSection } from '@/components/hud/form';
import { PaletteSwitcher } from '@/components/layout/PaletteSwitcher';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    SelectField,
    type SelectOptionGroup,
} from '@/components/ui/select-field';
import { useTimeZoneSetting } from '@/lib/hooks/common';

const AUTO = 'auto';

function zoneGroups(
    filter: string,
    current: string | null
): SelectOptionGroup[] {
    const query = filter.trim().toLowerCase();

    const zones = new Set(Intl.supportedValuesOf('timeZone'));

    if (current) zones.add(current);

    const byRegion = new Map<string, string[]>();

    for (const zone of zones) {
        if (query && !zone.toLowerCase().includes(query) && zone !== current)
            continue;

        const region = zone.includes('/') ? zone.split('/')[0] : 'UTC';

        byRegion.set(region, [...(byRegion.get(region) ?? []), zone]);
    }

    return [...byRegion].map(([label, list]) => ({
        label,
        options: list.map((zone) => ({
            value: zone,
            label: zone.replaceAll('_', ' '),
        })),
    }));
}

export function PreferencesClient() {
    const t = useTranslations('auth.settings.preferences');

    const { timeZone, browserZone, set } = useTimeZoneSetting();

    const [filter, setFilter] = useState('');

    const groups = useMemo(
        () => zoneGroups(filter, timeZone),
        [filter, timeZone]
    );

    return (
        <HudFormPage header={{ title: t('title'), aside: t('subtitle') }}>
            <HudSection title={t('language')}>
                <LocaleSwitcher />
            </HudSection>
            <HudSection title={t('theme')}>
                <PaletteSwitcher />
            </HudSection>
            <HudSection title={t('timeZone')}>
                <Label htmlFor="time-zone-search">{t('search')}</Label>
                <Input
                    id="time-zone-search"
                    placeholder={t('search')}
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
                <div className="mt-3">
                    <SelectField
                        id="time-zone"
                        aria-label={t('timeZone')}
                        value={timeZone ?? AUTO}
                        onValueChange={(value) =>
                            void set(value === AUTO ? null : value)
                        }
                        groups={[
                            {
                                label: t('autoGroup'),
                                options: [
                                    {
                                        value: AUTO,
                                        label: t('auto', { zone: browserZone }),
                                    },
                                ],
                            },
                            ...groups,
                        ]}
                    />
                </div>
                <p className="mt-2 text-xs text-hud-muted">{t('hint')}</p>
            </HudSection>
        </HudFormPage>
    );
}
