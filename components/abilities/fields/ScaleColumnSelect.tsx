'use client';

import { useTranslations } from 'next-intl';

import { useAbilityEditor } from '@/components/abilities/editor-context';
import { HUD_SELECT_CLASS } from '@/components/hud/form';
import { SelectField } from '@/components/ui/select-field';

export function ScaleColumnSelect({
    id,
    value,
    onChange,
    poolsOnly = false,
}: {
    id: string;
    value: string | undefined;
    onChange: (key: string) => void;
    poolsOnly?: boolean;
}) {
    const t = useTranslations('abilities.fields');

    const columns = (useAbilityEditor().classColumns ?? []).filter(
        (c) => !poolsOnly || c.pool
    );

    return (
        <SelectField
            id={id}
            aria-label={t('classColumn')}
            triggerClassName={`${HUD_SELECT_CLASS} w-full`}
            value={value ?? ''}
            onValueChange={onChange}
            placeholder="—"
            options={columns.map((c) => ({
                value: c.key,
                label: `${c.label} (${c.key})`,
            }))}
        />
    );
}
