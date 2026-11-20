'use client';

import { useTranslations } from 'next-intl';

import { useWorldEditorContext } from '../WorldEditorContext';

import { SelectField } from '@/components/ui/select-field';

interface MarkerLayerFieldProps {
    value: string | null;
    onChange(layerId: string): void;
}

export function MarkerLayerField({ value, onChange }: MarkerLayerFieldProps) {
    const t = useTranslations('world.layers');

    const layers = useWorldEditorContext().detail?.layers ?? [];

    if (layers.length === 0) return null;

    return (
        <label className="flex items-center justify-between gap-2 text-xs">
            {t('markerLayer')}
            <SelectField
                aria-label={t('markerLayer')}
                value={value ?? ''}
                onValueChange={onChange}
                allowNone
                noneLabel={t('noLayer')}
                options={layers.map((l) => ({ value: l.id, label: l.name }))}
                triggerClassName="w-40"
            />
        </label>
    );
}
