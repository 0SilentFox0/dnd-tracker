'use client';

import { useTranslations } from 'next-intl';

import { BoundedNumberInput } from '@/components/ui/bounded-number-input';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/labeled-input';
import type { SpeciesProfile } from '@/systems/wfrp/rules/creation';
import {
    APPEARANCE_COLOURS,
    type AppearanceColour,
} from '@/systems/wfrp/rules/creation/story';

type Appearance = NonNullable<SpeciesProfile['appearance']>;

const EMPTY: Appearance = {
    age: { base: 0, dice: 0 },
    heightCm: { base: 0, dice: 0 },
    eyes: [],
    hair: [],
};

function ColourPicker({
    label,
    selected,
    onToggle,
}: {
    label: string;
    selected: AppearanceColour[];
    onToggle: (c: AppearanceColour) => void;
}) {
    const tc = useTranslations('wfrpCreation.story.colours');

    return (
        <div role="group" aria-label={label} className="space-y-1">
            <p className="text-sm">{label}</p>
            <div className="flex flex-wrap gap-1">
                {APPEARANCE_COLOURS.map((c) => (
                    <Button
                        key={c}
                        type="button"
                        size="sm"
                        variant={selected.includes(c) ? 'default' : 'outline'}
                        aria-pressed={selected.includes(c)}
                        onClick={() => onToggle(c)}
                    >
                        {tc(c)}
                    </Button>
                ))}
            </div>
        </div>
    );
}

export function AppearanceEditor({
    value,
    onChange,
}: {
    value: Appearance | undefined;
    onChange: (next: Appearance | undefined) => void;
}) {
    const t = useTranslations('wfrpCreation.story.appearance');

    const a = value ?? EMPTY;

    const roll = (
        label: string,
        key: 'age' | 'heightCm',
        part: 'base' | 'dice',
        max: number
    ) => (
        <FormField label={label}>
            <BoundedNumberInput
                aria-label={label}
                className="min-h-11"
                value={a[key][part]}
                min={0}
                max={max}
                onCommit={(v) =>
                    onChange({ ...a, [key]: { ...a[key], [part]: v } })
                }
            />
        </FormField>
    );

    const toggle = (key: 'eyes' | 'hair') => (c: AppearanceColour) =>
        onChange({
            ...a,
            [key]: a[key].includes(c)
                ? a[key].filter((x) => x !== c)
                : [...a[key], c],
        });

    return (
        <section aria-label={t('title')} className="space-y-2">
            <h3 className="text-sm font-semibold">{t('title')}</h3>
            <p className="text-sm text-hud-muted">{t('hint')}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {roll(t('ageBase'), 'age', 'base', 400)}
                {roll(t('ageDice'), 'age', 'dice', 10)}
                {roll(t('heightBase'), 'heightCm', 'base', 400)}
                {roll(t('heightDice'), 'heightCm', 'dice', 10)}
            </div>
            <ColourPicker
                label={t('eyes')}
                selected={a.eyes}
                onToggle={toggle('eyes')}
            />
            <ColourPicker
                label={t('hair')}
                selected={a.hair}
                onToggle={toggle('hair')}
            />
            {value && (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange(undefined)}
                >
                    {t('clear')}
                </Button>
            )}
        </section>
    );
}
