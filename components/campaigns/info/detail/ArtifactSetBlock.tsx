'use client';

import { useTranslations } from 'next-intl';
import { Gem } from 'lucide-react';

import { DetailHeader, DetailRoot, DetailSection } from './DetailParts';

import { AbilityFlowList } from '@/components/abilities/flow/AbilityFlow';
import type { ArtifactSetForReference } from '@/types/info-reference';

export function ArtifactSetBlock({ set }: { set: ArtifactSetForReference }) {
    const t = useTranslations('dashboard.reference.card');

    return (
        <DetailRoot>
            <DetailHeader
                icon={set.icon}
                name={set.name}
                fallback={<Gem className="size-7" />}
            />
            {set.description && (
                <p className="text-sm text-hud-bone">{set.description}</p>
            )}
            {set.artifactNames.length > 0 && (
                <p className="text-sm text-hud-muted">
                    {t('setItems', { names: set.artifactNames.join(', ') })}
                </p>
            )}
            {set.bonuses.length > 0 && (
                <DetailSection title={t('setBonuses')}>
                    <AbilityFlowList lines={set.bonuses} />
                </DetailSection>
            )}
        </DetailRoot>
    );
}
