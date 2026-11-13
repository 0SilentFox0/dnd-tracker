import { describe, expect, it } from 'vitest';

import { applyCharacterResources } from '../battle';

import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { slotOf } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { wfrpState } from '@/systems/wfrp/rules/state';
import type { BattleParticipant } from '@/types/battle';

const wfrp = (): BattleParticipant => {
    const p = createMockParticipant();

    return {
        ...p,
        abilities: {
            ...p.abilities,
            system: slotOf({ ...DEFAULT_CHARACTERISTICS, fate: 2 }),
        },
    };
};

describe('applyCharacterResources fortune', () => {
    it('falls back to Fate when nothing is saved', () => {
        expect(
            wfrpState(
                applyCharacterResources(
                    wfrp(),
                    { resources: {}, inspiration: null },
                    WFRP_RULES
                )
            ).fortune
        ).toBe(2);
        expect(
            wfrpState(
                applyCharacterResources(
                    wfrp(),
                    { resources: null, inspiration: null },
                    WFRP_RULES
                )
            ).fortune
        ).toBe(2);
    });

    it('prefers the saved value, including 0', () => {
        expect(
            wfrpState(
                applyCharacterResources(
                    wfrp(),
                    { resources: { fortune: 0 }, inspiration: null },
                    WFRP_RULES
                )
            ).fortune
        ).toBe(0);
    });

    it('leaves non-wfrp participants untouched', () => {
        expect(
            applyCharacterResources(
                createMockParticipant(),
                { resources: {}, inspiration: null },
                DEFAULT_RULES
            ).battleData.system
        ).toBeUndefined();
    });
});
