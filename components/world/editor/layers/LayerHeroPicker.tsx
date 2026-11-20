'use client';

import { useTranslations } from 'next-intl';

import { Checkbox } from '@/components/ui/checkbox';
import type { RosterHero } from '@/types/characters';

interface LayerHeroPickerProps {
    heroes: Pick<RosterHero, 'id' | 'name'>[];
    selected: string[];
    onToggle(heroId: string, on: boolean): void;
}

export function LayerHeroPicker({
    heroes,
    selected,
    onToggle,
}: LayerHeroPickerProps) {
    const t = useTranslations('world.layers');

    if (heroes.length === 0)
        return <p className="text-xs text-hud-muted">{t('noHeroes')}</p>;

    return (
        <fieldset className="space-y-1">
            <legend className="mb-1 text-xs text-hud-muted">
                {t('heroes')}
            </legend>
            {heroes.map((hero) => (
                <label key={hero.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                        checked={selected.includes(hero.id)}
                        onCheckedChange={(v) => onToggle(hero.id, v === true)}
                    />
                    {hero.name}
                </label>
            ))}
        </fieldset>
    );
}
