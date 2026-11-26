import { describe, expect, it } from 'vitest';

import { toRacePreview } from '@/lib/utils/races/reference-preview';
import type { Race } from '@/types/races';

const race = {
    id: 'r1',
    campaignId: 'c1',
    name: 'Elf',
    availableSkills: [],
    disabledSkills: [],
    createdAt: new Date(0),
    updatedAt: new Date(0),
} as Race;

describe('toRacePreview', () => {
    it('overlays form data on the stored race', () => {
        const out = toRacePreview(race, {
            name: 'Dwarf',
            icon: '',
            availableSkills: ['a'],
            disabledSkills: [],
            abilities: [],
        });

        expect(out).toMatchObject({
            id: 'r1',
            name: 'Dwarf',
            icon: null,
            availableSkills: ['a'],
        });
    });
});
