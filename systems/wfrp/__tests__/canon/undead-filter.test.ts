import { describe, expect } from 'vitest';

import { bookExample } from './book-example';

import { ParticipantSide } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { matchesTargetFilter } from '@/lib/utils/battle/spell/target-filter';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { trait } from '@/systems/wfrp/rules/traits/__tests__/fixtures';
import { TRAIT_RECIPES } from '@/systems/wfrp/rules/traits/recipes';

const canon = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const foe = (traits: string[]) =>
    makeParticipant({
        id: 'f',
        side: ParticipantSide.ENEMY,
        abilities: traits.map((t) =>
            trait([{ kind: 'wfrpCreature', trait: t }])
        ),
    });

describe('canon: Undead as a spell target tag (p223)', () => {
    const filter = { tags: ['undead'] };

    const level = { spellLevel: 1 };

    bookExample(223, 'only a creature with the Undead trait passes', () => {
        expect(matchesTargetFilter(foe(['undead']), filter, level, canon)).toBe(
            true
        );
        expect(matchesTargetFilter(foe(['fly']), filter, level, canon)).toBe(
            false
        );
        expect(matchesTargetFilter(foe([]), filter, level)).toBe(false);
    });
});

describe('canon: Fly ignores terrain (p358)', () => {
    bookExample(
        358,
        'the Flier recipe carries the difficult-terrain flag',
        () => {
            const recipe = TRAIT_RECIPES.find((r) => r.id === 'flier');

            const built = recipe?.build({}, { name: 'Flier' } as never);

            const effects = JSON.stringify(built);

            expect(effects).toContain('"trait":"fly"');
            expect(effects).toContain('"flag":"ignoreDifficultTerrain"');
        }
    );
});
