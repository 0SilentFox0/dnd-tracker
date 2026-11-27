'use client';

import { useState } from 'react';

import { useSearch } from '@/lib/hooks/common';
import { groupUnitsByRaceName } from '@/lib/utils/units/group-units';
import type { SetupUnit } from '@/types/battle-setup';

const fieldsOf = (unit: SetupUnit) => [unit.name, unit.raceName];

export function useSetupUnitsFilter(units: SetupUnit[]) {
    const search = useSearch(units, fieldsOf);

    const [selectedRaces, setSelectedRaces] = useState<string[]>([]);

    const [selectedLevels, setSelectedLevels] = useState<number[]>([]);

    const levelChips = [...new Set(search.items.map((u) => u.level))]
        .sort((a, b) => a - b)
        .map((level) => ({
            level,
            count: search.items.filter((u) => u.level === level).length,
            active: selectedLevels.includes(level),
        }));

    const byLevel =
        selectedLevels.length > 0
            ? search.items.filter((u) => selectedLevels.includes(u.level))
            : search.items;

    const allGroups = groupUnitsByRaceName(byLevel);

    const activeRaces = selectedRaces.filter((key) => allGroups.has(key));

    const groups =
        activeRaces.length > 0
            ? new Map(
                  [...allGroups].filter(([key]) => activeRaces.includes(key))
              )
            : allGroups;

    const toggleRace = (key: string) =>
        setSelectedRaces((current) =>
            current.includes(key)
                ? current.filter((k) => k !== key)
                : [...current, key]
        );

    const toggleLevel = (level: number) =>
        setSelectedLevels((current) =>
            current.includes(level)
                ? current.filter((l) => l !== level)
                : [...current, level]
        );

    return {
        query: search.query,
        groups,
        chips: [...allGroups].map(([key, list]) => ({
            key,
            count: list.length,
            active: activeRaces.includes(key),
        })),
        levelChips,
        toggleRace,
        toggleLevel,
        isFiltered:
            search.isActive ||
            activeRaces.length > 0 ||
            selectedLevels.length > 0,
    };
}
