import { describe, expect, it } from 'vitest';

import { systemUiOf } from '@/components/systems/registry';

describe('deathsaves ui contribution', () => {
    it('dnd5e gets the badge and the rules section, bare d20 does not', () => {
        const dnd = systemUiOf('dnd5e');

        const bare = systemUiOf('d20');

        expect(dnd.battle.badges?.map((b) => b.name)).toEqual([
            'DeathSaveBadge',
        ]);
        expect(dnd.rulesSections?.deathSaves).toBeDefined();
        expect(bare.battle.badges ?? []).toEqual([]);
        expect(bare.rulesSections?.deathSaves).toBeUndefined();
    });
});
