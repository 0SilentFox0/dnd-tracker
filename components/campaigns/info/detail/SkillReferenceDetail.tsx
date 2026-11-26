'use client';

import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';

import { AppearanceSection } from './AppearanceSection';
import { DetailSection, ReferenceDetailShell } from './ReferenceDetailShell';
import type { ReferenceDetailProps } from './types';

import { HudPill } from '@/components/hud/page';
import { useUpdateSkillAppearance } from '@/lib/hooks/skills';
import { useTranslator } from '@/lib/i18n/use-translator';
import { formatMechanicsSkill } from '@/lib/utils/campaigns/info-reference';
import type { SkillForReference } from '@/types/info-reference';

export function SkillReferenceDetail({
    campaignId,
    item: skill,
    isDM,
}: ReferenceDetailProps<SkillForReference>) {
    const t = useTranslations('skills.reference');

    const translate = useTranslator();

    const appearance = useUpdateSkillAppearance(
        campaignId,
        skill.id,
        skill.appearanceDescription ?? ''
    );

    return (
        <ReferenceDetailShell
            icon={skill.icon}
            fallback={<Sparkles className="size-7" />}
            name={skill.name}
            chips={
                skill.mainSkillName ? (
                    <HudPill
                        tone="accent"
                        icon={
                            skill.mainSkillColor ? (
                                <span
                                    aria-hidden
                                    className="size-2 rounded-full"
                                    style={{
                                        backgroundColor: skill.mainSkillColor,
                                    }}
                                />
                            ) : undefined
                        }
                    >
                        {skill.mainSkillName}
                    </HudPill>
                ) : null
            }
        >
            <AppearanceSection
                title={t('appearance')}
                placeholder={t('appearancePlaceholder')}
                saveLabel={t('saveAppearance')}
                controller={appearance}
                isDM={isDM}
            />
            {skill.description ? (
                <DetailSection title={t('description')}>
                    <p className="whitespace-pre-line">{skill.description}</p>
                </DetailSection>
            ) : null}
            <DetailSection title={t('how')}>
                <p>{formatMechanicsSkill(skill, translate)}</p>
            </DetailSection>
        </ReferenceDetailShell>
    );
}
