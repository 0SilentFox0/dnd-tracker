'use client';

import { useTranslations } from 'next-intl';

import { DmEntityCard } from '@/components/common/entity/DmEntityCard';
import { HudPill } from '@/components/hud/page';
import type { BackgroundData } from '@/types/backgrounds';

export function BackgroundCard({
    background,
    campaignId,
    onDelete,
    canEdit = true,
}: {
    background: BackgroundData;
    campaignId: string;
    onDelete?: (backgroundId: string) => void;
    canEdit?: boolean;
}) {
    const t = useTranslations('backgrounds');

    const choices = background.choices.length;

    return (
        <DmEntityCard
            href={`/campaigns/${campaignId}/dm/backgrounds/${background.id}`}
            title={background.name}
            icon={background.icon}
            onDelete={() => onDelete?.(background.id)}
            canEdit={canEdit}
        >
            {choices > 0 && (
                <HudPill>
                    {t('card.choices', { count: choices })}
                </HudPill>
            )}
        </DmEntityCard>
    );
}
