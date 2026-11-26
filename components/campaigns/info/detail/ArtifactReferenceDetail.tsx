'use client';

import { useTranslations } from 'next-intl';
import { Gem } from 'lucide-react';

import {
    DetailChip,
    DetailHeader,
    DetailRoot,
    DetailSection,
} from './DetailParts';

import { AbilityFlowList } from '@/components/abilities/flow/AbilityFlow';
import { useTranslator } from '@/lib/i18n/use-translator';
import type { ArtifactForReference } from '@/types/info-reference';

interface ArtifactReferenceDetailProps {
    campaignId: string;
    item: ArtifactForReference;
    isDM: boolean;
}

export function ArtifactReferenceDetail({
    item,
}: ArtifactReferenceDetailProps) {
    const t = useTranslations('reference');

    const ta = useTranslator('artifacts');

    const holder = item.gear
        ? t('card.gear')
        : item.holderName
          ? t('card.heldBy', { name: item.holderName })
          : t('card.free');

    return (
        <DetailRoot>
            <DetailHeader
                icon={item.icon}
                name={item.name}
                fallback={<Gem className="size-7" />}
                chips={
                    <>
                        {item.rarity && (
                            <DetailChip>
                                {ta(`rarity.${item.rarity}`)}
                            </DetailChip>
                        )}
                        <DetailChip>{ta(`slots.${item.slot}`)}</DetailChip>
                        <DetailChip>{holder}</DetailChip>
                    </>
                }
            />
            {item.description && (
                <p className="text-sm text-hud-bone">{item.description}</p>
            )}
            {item.effects.length > 0 && (
                <DetailSection title={t('card.effects')}>
                    <AbilityFlowList lines={item.effects} />
                </DetailSection>
            )}
            {item.setName && (
                <DetailSection title={t('filters.artifactSet.label')}>
                    {item.setName}
                </DetailSection>
            )}
        </DetailRoot>
    );
}
