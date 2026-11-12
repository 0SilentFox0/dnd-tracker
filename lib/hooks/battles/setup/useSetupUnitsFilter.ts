'use client';

import { useState } from 'react';

import { useSearch } from '@/lib/hooks/common';
import { groupUnitsByRaceName } from '@/lib/utils/units/group-units';
import type { SetupUnit } from '@/types/battle-setup';

const fieldsOf = (unit: SetupUnit) => [unit.name, unit.raceName];

export function useSetupUnitsFilter(units: SetupUnit[]) {
    const search = useSearch(units, fieldsOf);

    const [selectedRaces, setSelectedRaces] = useState<string[]>([]);

    const allGroups = groupUnitsByRaceName(search.items);

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

    return {
        query: search.query,
        groups,
        chips: [...allGroups].map(([key, list]) => ({
            key,
            count: list.length,
            active: activeRaces.includes(key),
        })),
        toggleRace,
        isFiltered: search.isActive || activeRaces.length > 0,
    };
}
