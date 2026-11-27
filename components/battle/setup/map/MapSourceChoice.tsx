'use client';

import { useTranslations } from 'next-intl';

import { HudSegmented } from '@/components/hud';

export type MapSource = 'none' | 'own' | 'library';

export function MapSourceChoice({
    value,
    onChange,
    libraryVisible,
}: {
    value: MapSource;
    onChange: (value: MapSource) => void;
    libraryVisible: boolean;
}) {
    const t = useTranslations('battleSetup.map.source');

    const options: { value: MapSource; label: string }[] = [
        { value: 'none', label: t('none') },
        { value: 'own', label: t('own') },
        ...(libraryVisible
            ? [{ value: 'library' as const, label: t('library') }]
            : []),
    ];

    return (
        <HudSegmented
            id="map-source"
            label={t('label')}
            value={value}
            options={options}
            onValueChange={onChange}
        />
    );
}
