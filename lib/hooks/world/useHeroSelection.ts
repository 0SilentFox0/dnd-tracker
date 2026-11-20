'use client';

import { useState } from 'react';

import type { RosterHero } from './useWorldHeroes';

export interface HeroSelection {
    selected: string[];
    toggle(id: string): void;
    setOnly(ids: string[]): void;
    allSelected: boolean;
    selectAll(): void;
}

export function useHeroSelection(heroes: RosterHero[]): HeroSelection {
    const [picked, setPicked] = useState<string[]>([]);

    const selected = picked.filter((id) => heroes.some((h) => h.id === id));

    const allSelected = heroes.length > 0 && selected.length === heroes.length;

    return {
        selected,
        toggle: (id) =>
            setPicked(
                selected.includes(id)
                    ? selected.filter((x) => x !== id)
                    : [...selected, id]
            ),
        setOnly: (ids) => setPicked(ids),
        allSelected,
        selectAll: () => setPicked(allSelected ? [] : heroes.map((h) => h.id)),
    };
}
