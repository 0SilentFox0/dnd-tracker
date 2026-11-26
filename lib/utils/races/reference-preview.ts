import type { Race, RaceFormData } from '@/types/races';

export function toRacePreview(race: Race, data: RaceFormData): Race {
    return {
        ...race,
        ...data,
        icon: data.icon || null,
        color: data.color || null,
    };
}
