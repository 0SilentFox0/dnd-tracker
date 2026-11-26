import { describe, expect, it } from 'vitest';

import { toClassReferencePreview } from '@/lib/utils/characters/classes/reference-preview';
import type { GameClassData } from '@/types/classes';

const data: Omit<GameClassData, 'id'> = {
    name: 'Rogue',
    icon: null,
    color: null,
    hitDie: 8,
    savingThrows: [],
    proficiencies: { armor: [], weapons: [], tools: [] },
    skillChoices: { count: 0, from: [] },
    caster: 'none',
    spellcastingAbility: null,
    features: [{ level: 1, description: 'Sneak', abilities: [] }],
    subclassLevel: null,
    subclasses: [],
} as never;

describe('toClassReferencePreview', () => {
    it('maps class data', () => {
        const out = toClassReferencePreview(data, { id: 'c1' });

        expect(out.id).toBe('c1');
        expect(out.name).toBe('Rogue');
        expect(out.summary[0].key).toBe('hitDie');
        expect(out.features).toHaveLength(1);
    });
});
