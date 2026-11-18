import { useMemo } from 'react';

import type { RaceProfileItem } from '@/systems/wfrp/api/types';
import { isUsableProfile, type SpeciesProfile } from '@/systems/wfrp/rules/creation';
import type { Race } from '@/types/races';

export function useWfrpSpecies({
    enabled,
    profiles,
    races,
}: {
    enabled: boolean;
    profiles?: RaceProfileItem[];
    races?: Race[];
}) {
    return useMemo(() => {
        if (!enabled) return [];

        const byRace = new Map(
            (profiles ?? []).map((p) => [p.raceId, p.profile])
        );

        return (races ?? []).flatMap(
            (race): { race: Race; profile: SpeciesProfile }[] => {
                const profile = byRace.get(race.id);

                return profile && isUsableProfile(profile)
                    ? [{ race, profile }]
                    : [];
            }
        );
    }, [enabled, profiles, races]);
}
