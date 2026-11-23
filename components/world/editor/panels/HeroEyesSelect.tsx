'use client';

import { useTranslations } from 'next-intl';
import { Eye } from 'lucide-react';

import { SelectField } from '@/components/ui/select-field';
import type { RosterHero } from '@/lib/hooks/world';

interface HeroEyesSelectProps {
    heroes: RosterHero[];
    value: string | null;
    onChange(heroId: string | null): void;
}

export function HeroEyesSelect({
    heroes,
    value,
    onChange,
}: HeroEyesSelectProps) {
    const t = useTranslations('world.eyes');

    return (
        <label
            data-slot="world-hero-eyes"
            className="flex h-10 w-full max-w-full min-w-0 shrink-0 items-center gap-1.5 rounded-md border border-hud-rule bg-black/40 px-2 text-xs text-hud-muted lg:w-auto"
        >
            <Eye className="size-4 shrink-0" aria-hidden />
            <span className="sr-only">{t('label')}</span>
            <SelectField
                aria-label={t('label')}
                value={value ?? ''}
                onValueChange={(v) => onChange(v || null)}
                allowNone
                noneLabel={t('dm')}
                options={heroes.map((h) => ({ value: h.id, label: h.name }))}
                triggerClassName="h-auto min-w-0 border-0 bg-transparent px-0 py-0 text-sm text-hud-ink shadow-none data-[size=default]:h-auto max-lg:flex-1 lg:max-w-36 dark:bg-transparent"
            />
        </label>
    );
}
