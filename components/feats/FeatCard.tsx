'use client';

import { useTranslations } from 'next-intl';

import { DmEntityCard } from '@/components/common/entity/DmEntityCard';
import { HudPill } from '@/components/hud/page';
import { summarizeChoices } from '@/lib/utils/choices/summary';
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

    const choices = summarizeChoices(feat.choices);

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
