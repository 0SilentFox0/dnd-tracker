'use client';

import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';

import { AppearanceBlock } from './AppearanceBlock';
import {
    DetailChip,
    DetailHeader,
    DetailRoot,
    DetailSection,
} from './DetailParts';

import { useUpdateSkillAppearance } from '@/lib/hooks/skills';
import { useTranslator } from '@/lib/i18n/use-translator';
import { formatMechanicsSkill } from '@/lib/utils/campaigns/info-reference';
import type { SkillForReference } from '@/types/info-reference';

interface SkillReferenceDetailProps {
    campaignId: string;
    item: SkillForReference;
    isDM: boolean;
}

export function SkillReferenceDetail({
    campaignId,
    item,
    isDM,
}: SkillReferenceDetailProps) {
    const t = useTranslations('dashboard.reference.card');

    const translate = useTranslator();

    const {
        draft: { data: appearance, set: setAppearance },
        saveText,
    } = useUpdateSkillAppearance(
        campaignId,
        item.id,
        item.appearanceDescription ?? ''
    );

    return (
        <DetailRoot>
            <DetailHeader
                icon={item.icon}
                name={item.name}
                fallback={<Sparkles className="size-7" />}
                chips={
                    item.mainSkillName && (
                        <DetailChip color={item.mainSkillColor}>
                            {item.mainSkillName}
                        </DetailChip>
                    )
                }
            />
            <AppearanceBlock
                kind="skill"
                text={appearance}
                canEdit={isDM}
                onSave={async (text) => {
                    setAppearance(text);
                    saveText(text);
                }}
            />
            {item.description && (
                <DetailSection title={t('skillDescription')}>
                    {item.description}
                </DetailSection>
            )}
            <DetailSection title={t('skillHow')}>
                {formatMechanicsSkill(item, translate)}
            </DetailSection>
        </DetailRoot>
    );
}
