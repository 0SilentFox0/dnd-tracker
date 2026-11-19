'use client';

import { useTranslations } from 'next-intl';

import { RulesSection } from '@/components/rules/RulesSection';
import { SelectField } from '@/components/ui/select-field';
import type { RulesFormState } from '@/lib/hooks/campaigns';
import { EDITION_PRESETS } from '@/systems/wfrp/rules/edition/profiles';

export function EditionSection({ form }: { form: RulesFormState }) {
    const t = useTranslations('rules');

    return (
        <RulesSection mechanic="edition">
            <SelectField
                id="rules-edition-preset"
                aria-label={t('sections.edition.preset')}
                value={form.data.edition.preset}
                onValueChange={(preset) =>
                    form.set('edition', {
                        preset: preset as (typeof EDITION_PRESETS)[number],
                    })
                }
                options={EDITION_PRESETS.map((value) => ({
                    value,
                    label: t(`sections.edition.options.${value}`),
                }))}
            />
        </RulesSection>
    );
}
