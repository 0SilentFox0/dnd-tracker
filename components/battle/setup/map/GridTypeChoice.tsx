'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';

import { OptionButton } from '@/components/hud/OptionButton';
import { Label } from '@/components/ui/label';
import type { GridKind } from '@/types/battle-grid';

const KINDS: GridKind[] = ['square', 'hex'];

export function GridTypeChoice({
    value,
    onChange,
}: {
    value: GridKind;
    onChange: (kind: GridKind) => void;
}) {
    const t = useTranslations('battleSetup.map.grid');

    const labelId = useId();

    return (
        <div className="space-y-2">
            <Label id={labelId}>{t('label')}</Label>
            <div
                role="radiogroup"
                aria-labelledby={labelId}
                className="grid grid-cols-2 gap-2"
            >
                {KINDS.map((kind) => (
                    <OptionButton
                        key={kind}
                        role="radio"
                        variant="form"
                        checked={value === kind}
                        text={{ title: t(kind) }}
                        onClick={() => onChange(kind)}
                    />
                ))}
            </div>
            {value === 'hex' && (
                <p className="text-xs text-hud-muted">{t('hexHint')}</p>
            )}
        </div>
    );
}
