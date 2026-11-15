import { describe, expect, it } from 'vitest';

import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import {
    applyCharacterResources,
    battleResultOutcome,
} from '@/lib/utils/characters/resources/battle';
import { DEFAULT_RULES, type Ruleset } from '@/lib/utils/rules';
import { d20State, withD20State } from '@/systems/d20/rules/state';
import type { StoredCharacterState } from '@/types/characters';

const rulesWith = (inspiration: boolean): Ruleset => ({
    ...DEFAULT_RULES,
    outOfCombat: { ...DEFAULT_RULES.outOfCombat, inspiration },
});

const stored = (inspiration: boolean | null): StoredCharacterState => ({
    resources: null,
    inspiration,
});

describe('d20 fromStored', () => {
    it('seeds inspiration as true when the sheet has it and the rule is on', () => {
        const p = applyCharacterResources(
            createMockParticipant(),
            stored(true),
            rulesWith(true)
        );

        expect(d20State(p)).toEqual({ inspiration: true });
    });

    it('never seeds a false: no slot appears', () => {
        const p = applyCharacterResources(
            createMockParticipant(),
            stored(false),
            rulesWith(true)
        );

        expect(p.battleData.system).toBeUndefined();
    });

    it('seeds nothing when the rule is off', () => {
        const p = applyCharacterResources(
            createMockParticipant(),
            stored(true),
            rulesWith(false)
        );

        expect(p.battleData.system).toBeUndefined();
    });
});

describe('d20 persist', () => {
    const spent = withD20State(createMockParticipant(), {
        inspirationSpent: true,
    });

    it('asks to clear the sheet inspiration when it was spent', () => {
        expect(
            battleResultOutcome({}, spent, rulesWith(true)).clearInspiration
        ).toBe(true);
    });

    it('does not ask when nothing was spent or the rule is off', () => {
        expect(
            battleResultOutcome({}, createMockParticipant(), rulesWith(true))
                .clearInspiration
        ).toBeUndefined();
        expect(
            battleResultOutcome({}, spent, rulesWith(false)).clearInspiration
        ).toBeUndefined();
    });
});
