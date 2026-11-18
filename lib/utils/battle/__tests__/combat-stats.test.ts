import { describe, expect, it } from 'vitest';

import {
    HIDDEN_COMBAT_STATS,
    MODULE_COMBAT_STATS,
    NEUTRAL_HIDDEN_STATS,
} from '../combat-stats';
import { PATCHABLE_PARTICIPANT_FIELDS } from '../store/participant-patch';

describe('module combat stats', () => {
    it('hidden stats and their neutral value match the frozen allowlist', () => {
        expect(HIDDEN_COMBAT_STATS).toEqual(['morale']);
        expect(NEUTRAL_HIDDEN_STATS).toEqual({ morale: 0 });
    });

    it('patchable combat stats keep the stored order', () => {
        expect(MODULE_COMBAT_STATS).toEqual(['morale']);
        expect(PATCHABLE_PARTICIPANT_FIELDS.combatStats).toEqual([
            'currentHp',
            'tempHp',
            'maxHp',
            'morale',
            'status',
        ]);
    });
});
