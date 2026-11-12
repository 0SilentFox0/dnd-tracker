'use client';

import { useTranslations } from 'next-intl';

import { SetList } from './SetList';

import { HudSection } from '@/components/hud/form';
import type { ItemSectionProps } from '@/components/systems/types';

export function ArtifactSetsSection({ sheet, variant }: ItemSectionProps) {
    const t = useTranslations('characterProfile');

    const { sets } = sheet.items;

    if (sets.length === 0) return null;

    if (variant === 'inventory') return <SetList sets={sets} />;

    return (
        <HudSection title={t('sets.title')}>
            <SetList sets={sets} />
        </HudSection>
    );
}
