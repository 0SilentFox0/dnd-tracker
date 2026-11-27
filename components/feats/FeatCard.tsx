'use client';

import { useTranslations } from 'next-intl';

import { DmEntityCard } from '@/components/common/entity/DmEntityCard';
import { Badge } from '@/components/ui/badge';
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
            <Badge variant="outline">{t(`types.${feat.type}`)}</Badge>
            {feat.prerequisite.level && (
                <Badge variant="outline">
                    {t('card.level', { level: feat.prerequisite.level })}
                </Badge>
            )}
            {feat.repeatable && (
                <Badge variant="outline">{t('card.repeatable')}</Badge>
            )}
            {choices.items.map((choice) => (
                <Badge key={choice.id} variant="outline">
                    {choice.count > 1
                        ? t('card.choice', {
                              label: choice.label,
                              count: choice.count,
                          })
                        : choice.label}
                </Badge>
            ))}
            {choices.more > 0 && (
                <Badge variant="outline">
                    {t('card.choicesMore', { count: choices.more })}
                </Badge>
            )}
        </DmEntityCard>
    );
}
