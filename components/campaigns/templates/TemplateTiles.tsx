'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import { HudCard, HudPill } from '@/components/hud/page';
import { SelectField } from '@/components/ui/select-field';
import { NATIVE_LANGUAGE_NAMES } from '@/lib/i18n/native-language-names';
import { ruleSystemLabelKey } from '@/lib/i18n/system-scope';
import {
    groupTemplates,
    pickVariant,
    type TemplateGroup,
} from '@/lib/utils/campaigns/template-variants';
import {
    isCanonicalTemplate,
    isLegacyLocalizedTemplate,
} from '@/lib/utils/templates/registry';

export interface TemplateTile {
    id: string;
    name: string;
    description: string | null;
    locale: string | null;
    templateKey: string | null;
    kind?: string;
    visibility?: string;
    system?: string;
}

const languageName = (code: string) =>
    NATIVE_LANGUAGE_NAMES[code as keyof typeof NATIVE_LANGUAGE_NAMES] ?? code;

function TemplateGroupTile({ group }: { group: TemplateGroup<TemplateTile> }) {
    const t = useTranslations('campaigns.templatePicker');

    const tg = useTranslations('gameTerms');

    const uiLocale = useLocale();

    const [pickedId, setPickedId] = useState<string | null>(null);

    const variant =
        Object.values(group.cards).find((c) => c.id === pickedId) ??
        pickVariant(group, uiLocale);

    const options = group.locales.map((code) => ({
        value: group.cards[code].id,
        label: languageName(code),
    }));

    return (
        <HudCard className="space-y-2">
            <Link href={`/campaigns/${variant.id}`} className="block space-y-2">
                <h3 className="hud-sc text-lg text-hud-ink">{variant.name}</h3>
                {variant.system && (
                    <HudPill tone="silver">
                        {tg(ruleSystemLabelKey(variant.system))}
                    </HudPill>
                )}
                {variant.description && (
                    <p className="text-sm text-hud-muted">
                        {variant.description}
                    </p>
                )}
            </Link>
            {options.length > 1 ? (
                <SelectField
                    aria-label={t('languageLabel')}
                    value={variant.id}
                    onValueChange={setPickedId}
                    groups={[{ label: t('language'), options }]}
                />
            ) : (
                (variant.locale || isCanonicalTemplate(variant)) && (
                    <p className="text-xs text-hud-muted">
                        {languageName(variant.locale ?? 'en')}
                    </p>
                )
            )}
        </HudCard>
    );
}

export function TemplateTiles({ templates }: { templates: TemplateTile[] }) {
    // Canonical SRD browsing always opens its stored English content. Private copies
    // remain independent even if older data retained the official template key.
    const canonical = templates
        .filter(isCanonicalTemplate)
        .map((template) => ({
            key: template.id,
            cards: { en: template },
            locales: ['en'],
        }));

    const other = groupTemplates(
        templates.filter(
            (template) =>
                !isCanonicalTemplate(template) &&
                !isLegacyLocalizedTemplate(template)
        )
    );

    return (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {[...canonical, ...other].map((group) => (
                <TemplateGroupTile key={group.key} group={group} />
            ))}
        </div>
    );
}
