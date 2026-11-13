'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { HudSection } from '@/components/hud/form';
import { SelectField } from '@/components/ui/select-field';
import { ruleSystemLabelKey } from '@/lib/i18n/system-scope';
import { moduleCatalog } from '@/lib/utils/rules/systems/catalog';

interface SystemPickerProps {
    value: string | undefined;
    onChange: (key: string) => void;
}

export function SystemPicker({ value, onChange }: SystemPickerProps) {
    const t = useTranslations('campaigns.form');

    const tg = useTranslations('gameTerms');

    const presets = moduleCatalog().presets;

    const current = value ?? presets[0]?.key;

    useEffect(() => {
        if (value === undefined && current) onChange(current);
    }, [value, current, onChange]);

    return (
        <HudSection title={t('system')}>
            <div className="space-y-2">
                <p className="text-sm text-hud-muted">{t('systemHint')}</p>
                <SelectField
                    aria-label={t('system')}
                    value={current ?? ''}
                    onValueChange={onChange}
                    options={presets.map((preset) => ({
                        value: preset.key,
                        label: tg(ruleSystemLabelKey(preset.key)),
                    }))}
                />
            </div>
        </HudSection>
    );
}
