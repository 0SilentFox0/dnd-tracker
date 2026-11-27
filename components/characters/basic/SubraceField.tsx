'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Label } from '@/components/ui/label';
import { LabeledInput } from '@/components/ui/labeled-input';
import { SelectField } from '@/components/ui/select-field';
import type { Race } from '@/types/races';

const OTHER = '__other__';

interface SubraceFieldProps {
    race?: Race;
    value: string;
    onChange: (value: string) => void;
}

export function subraceOptions(race?: Race): string[] {
    const lineage = race?.choices?.find((c) => c.lineage);

    return lineage?.options?.map((o) => o.name) ?? [];
}

export function SubraceField({ race, value, onChange }: SubraceFieldProps) {
    const t = useTranslations('characters.form.basic');

    const names = subraceOptions(race);

    const [custom, setCustom] = useState(false);

    if (names.length === 0) {
        return (
            <LabeledInput
                id="subrace"
                label={t('subrace')}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={t('subracePlaceholder')}
                containerClassName="w-full min-w-0"
                className="w-full"
            />
        );
    }

    const isOther = custom || (!!value && !names.includes(value));

    return (
        <div className="w-full min-w-0 space-y-1.5">
            <Label htmlFor="subrace">{t('subrace')}</Label>
            <SelectField
                id="subrace"
                value={isOther ? OTHER : value}
                onValueChange={(v) => {
                    if (v === OTHER) {
                        setCustom(true);

                        return;
                    }

                    setCustom(false);
                    onChange(v);
                }}
                placeholder={t('subraceNone')}
                allowNone
                noneLabel={t('subraceNone')}
                options={[
                    ...names.map((n) => ({ value: n, label: n })),
                    { value: OTHER, label: t('subraceOther') },
                ]}
                triggerClassName="w-full"
            />
            {isOther && (
                <LabeledInput
                    id="subrace-custom"
                    label={t('subraceOther')}
                    value={names.includes(value) ? '' : value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={t('subraceCustomPlaceholder')}
                    containerClassName="w-full min-w-0"
                    className="w-full"
                />
            )}
        </div>
    );
}
