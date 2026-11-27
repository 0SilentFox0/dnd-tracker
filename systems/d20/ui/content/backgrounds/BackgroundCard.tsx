'use client';

import { useTranslations } from 'next-intl';

import { DmEntityCard } from '@/components/common/entity/DmEntityCard';
import { HudPill } from '@/components/hud/page';
import { summarizeChoices } from '@/lib/utils/choices/summary';
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

    const choices = summarizeChoices(background.choices);

    return (
        <DmEntityCard
            href={`/campaigns/${campaignId}/dm/backgrounds/${background.id}`}
            title={background.name}
            icon={background.icon}
            onDelete={() => onDelete?.(background.id)}
            canEdit={canEdit}
        >
            {choices.items.map((choice) => (
                <HudPill key={choice.id}>
                    {choice.count > 1
                        ? t('card.choice', {
                              label: choice.label,
                              count: choice.count,
                          })
                        : choice.label}
                </HudPill>
            ))}
            {choices.more > 0 && (
                <HudPill>
                    {t('card.choicesMore', { count: choices.more })}
                </HudPill>
            )}
        </DmEntityCard>
    );
}
