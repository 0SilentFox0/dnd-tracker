'use client';

import { useTranslations } from 'next-intl';

import { DmEntityCard } from '@/components/common/entity/DmEntityCard';
import { HudPill } from '@/components/hud/page';
import type { FeatData } from '@/types/choices';

export function FeatCard({
    feat,
    campaignId,
    onDelete,
    canEdit = true,
}: {
    feat: FeatData;
    campaignId: string;
    onDelete?: (featId: string) => void;
    canEdit?: boolean;
}) {
    const t = useTranslations('feats');

    const choices = feat.choices.length;

    return (
        <DmEntityCard
            href={`/campaigns/${campaignId}/dm/feats/${feat.id}`}
            title={feat.name}
            icon={feat.icon}
            onDelete={() => onDelete?.(feat.id)}
            canEdit={canEdit}
        >
            <HudPill>{t(`types.${feat.type}`)}</HudPill>
            {feat.prerequisite.level && (
                <HudPill>
                    {t('card.level', { level: feat.prerequisite.level })}
                </HudPill>
            )}
            {feat.repeatable && <HudPill>{t('card.repeatable')}</HudPill>}
            {choices > 0 && (
                <HudPill>{t('card.choices', { count: choices })}</HudPill>
            )}
        </DmEntityCard>
    );
}
