'use client';

import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';

import { AppearanceSection } from './AppearanceSection';
import { DetailSection, ReferenceDetailShell } from './ReferenceDetailShell';
import type { ReferenceDetailProps } from './types';

import { HudPill } from '@/components/hud/page';
import { SpellBattlePreview } from '@/components/spells/preview/SpellBattlePreview';
import { useAbilityText } from '@/lib/hooks/abilities';
import { useUpdateSpellAppearance } from '@/lib/hooks/spells';
import { useTranslator } from '@/lib/i18n/use-translator';
import { formatMechanicsSpell } from '@/lib/utils/campaigns/info-reference';
import type { SpellForReference } from '@/types/info-reference';

export function SpellReferenceDetail({
    campaignId,
    item: spell,
    isDM,
}: ReferenceDetailProps<SpellForReference>) {
    const t = useTranslations('spells.reference');

    const translate = useTranslator();

    const appearance = useUpdateSpellAppearance(
        campaignId,
        spell.id,
        spell.appearanceDescription ?? ''
    );

    const effects = useAbilityText().lines(spell.effects);

    return (
        <ReferenceDetailShell
            icon={spell.icon}
            fallback={<Sparkles className="size-7" />}
            name={spell.name}
            chips={
                <>
                    <HudPill tone="accent">
                        {t('levelShort', { level: spell.level })}
                    </HudPill>
                    {spell.groupName ? (
                        <HudPill>{spell.groupName}</HudPill>
                    ) : null}
                </>
            }
        >
            <AppearanceSection
                title={t('appearance')}
                placeholder={t('appearancePlaceholder')}
                saveLabel={t('saveAppearance')}
                controller={appearance}
                isDM={isDM}
            />
            <DetailSection title={t('mechanics')}>
                <p>{formatMechanicsSpell(spell, translate)}</p>
            </DetailSection>
            {spell.description ? (
                <DetailSection title={t('description')}>
                    <p className="whitespace-pre-line">{spell.description}</p>
                </DetailSection>
            ) : null}
            {spell.effects.length > 0 ? (
                <DetailSection title={t('effects')}>
                    <ul className="list-inside list-disc space-y-0.5">
                        {effects.map((e, i) => (
                            <li key={i}>{e}</li>
                        ))}
                    </ul>
                </DetailSection>
            ) : null}
            {spell.rules ? (
                <SpellBattlePreview
                    spell={{
                        id: spell.id,
                        name: spell.name,
                        level: spell.level,
                        groupId: null,
                        fx: spell.fx,
                        rules: spell.rules,
                    }}
                />
            ) : null}
        </ReferenceDetailShell>
    );
}
