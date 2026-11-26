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

import { SpellBattlePreview } from '@/components/spells/preview/SpellBattlePreview';
import { useAbilityText } from '@/lib/hooks/abilities';
import { useUpdateSpellAppearance } from '@/lib/hooks/spells';
import { useTranslator } from '@/lib/i18n/use-translator';
import { formatMechanicsSpell } from '@/lib/utils/campaigns/info-reference';
import type { SpellForReference } from '@/types/info-reference';

interface SpellReferenceDetailProps {
    campaignId: string;
    item: SpellForReference;
    isDM: boolean;
}

export function SpellReferenceDetail({
    campaignId,
    item,
    isDM,
}: SpellReferenceDetailProps) {
    const t = useTranslations('dashboard.reference.card');

    const translate = useTranslator();

    const effects = useAbilityText().lines(item.effects);

    const {
        draft: { data: appearance, set: setAppearance },
        saveText,
    } = useUpdateSpellAppearance(
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
                    <>
                        <DetailChip>
                            {t('levelShort', { level: item.level })}
                        </DetailChip>
                        {item.groupName && (
                            <DetailChip>{item.groupName}</DetailChip>
                        )}
                    </>
                }
            />
            {item.description && (
                <p className="text-sm text-hud-bone">{item.description}</p>
            )}
            <AppearanceBlock
                text={appearance}
                canEdit={isDM}
                onSave={async (text) => {
                    setAppearance(text);
                    saveText(text);
                }}
            />
            <DetailSection title={t('mechanics')}>
                {formatMechanicsSpell(item, translate)}
            </DetailSection>
            {item.effects.length > 0 && (
                <DetailSection title={t('effects')}>
                    <ul className="list-inside list-disc space-y-0.5">
                        {effects.map((e, i) => (
                            <li key={i}>{e}</li>
                        ))}
                    </ul>
                </DetailSection>
            )}
            {item.rules && (
                <SpellBattlePreview
                    spell={{
                        id: item.id,
                        name: item.name,
                        level: item.level,
                        groupId: null,
                        fx: item.fx,
                        rules: item.rules,
                    }}
                />
            )}
        </DetailRoot>
    );
}
