import { describe, expect, it } from 'vitest';

import { buildCharacterUpdateData } from '@/lib/server/characters/core/build-character-update-data';
import { allLevelResets } from '@/lib/utils/rules/systems';

const hero = {
    level: 3,
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    spellSlots: {},
    seenLevel: null,
};

const lower = (to: number) =>
    buildCharacterUpdateData({
        character: hero,
        data: { level: to },
        campaign: { maxLevel: 20 },
        race: null,
        resets: allLevelResets(),
    }).columnResets;

describe('allLevelResets', () => {
    it('a level-down wipes the tree progress whatever the composition', () => {
        expect(lower(2)).toEqual({ skillTreeProgress: {} });
    });

    it('a level-up resets nothing', () => {
        expect(lower(4)).toEqual({});
    });

    it('lists each reset once', () => {
        const resets = allLevelResets();

        expect(new Set(resets).size).toBe(resets.length);
    });
});
