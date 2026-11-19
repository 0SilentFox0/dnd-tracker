import { describe, expect, it } from 'vitest';

import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { formAllowed } from '@/lib/utils/battle/transform/apply-transforms';
import type { BattleParticipant } from '@/types/battle';

const withAbilities = (
    over: Partial<BattleParticipant['abilities']>
): BattleParticipant => {
    const p = makeParticipant({ id: 'x', level: 3 });

    return { ...p, abilities: { ...p.abilities, ...over } };
};

describe('polymorph form limits', () => {
    const pick = { creatureType: 'beast' };

    it('allows a beast up to the target level when it has no CR', () => {
        const target = withAbilities({});

        expect(
            formAllowed(withAbilities({ creatureType: 'beast', cr: 2 }), target, pick)
        ).toBe(true);
        expect(
            formAllowed(withAbilities({ creatureType: 'beast', cr: 4 }), target, pick)
        ).toBe(false);
    });

    it('uses the target CR when it has one and rejects other types', () => {
        const target = withAbilities({ cr: 5 });

        expect(
            formAllowed(withAbilities({ creatureType: 'beast', cr: 5 }), target, pick)
        ).toBe(true);
        expect(
            formAllowed(withAbilities({ creatureType: 'undead', cr: 1 }), target, pick)
        ).toBe(false);
    });
});
