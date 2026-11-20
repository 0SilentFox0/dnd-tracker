'use client';

import { useTranslations } from 'next-intl';

import type { ResourceFieldsProps } from '@/components/systems/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const FIELDS = [
    { key: 'fortune', max: 9 },
    { key: 'fate', max: 9 },
    { key: 'sin', max: 10 },
] as const;

export function ResourceFields({ values, onChange }: ResourceFieldsProps) {
    const t = useTranslations('rest.resources');

    return (
        <div className="grid grid-cols-3 gap-2">
            {FIELDS.map(({ key, max }) => (
                <div key={key} className="min-w-0">
                    <Label htmlFor={`res-${key}`}>{t(key)}</Label>
                    <Input
                        id={`res-${key}`}
                        type="number"
                        min={0}
                        max={max}
                        value={values[key] ?? ''}
                        onChange={(e) => onChange(key, e.target.value)}
                    />
                </div>
            ))}
        </div>
    );
}
