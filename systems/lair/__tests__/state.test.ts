import { describe, expect, it } from 'vitest';

import {
    bareD20Rules,
    dnd5eRules,
} from '@/lib/__tests__/helpers/dnd5e-modules';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { lairOf } from '@/lib/utils/battle/actions/access';
import { d20State } from '@/systems/d20/rules/state';
import { LAIR_RULES } from '@/systems/lair/rules/lair';
import {
    lairStateOf,
    resistSpentOf,
    upgradeLairState,
} from '@/systems/lair/rules/state';
import type { BattleParticipant } from '@/types/battle';

const legacy = (): BattleParticipant => {
    const p = createMockParticipant();

    return {
        ...p,
        battleData: {
            ...p.battleData,
            legendary: { actions: 1, actionsLeft: 1, resistLeft: 1 },
            lair: {
                active: true,
                usedRound: 2,
                lastKey: 'k',
                baseResistances: 2,
                resistSpent: 1,
            },
        } as BattleParticipant['battleData'],
    };
};

describe('lair state', () => {
    it('reads the pre-ext battleData.lair as a fallback', () => {
        expect(lairStateOf(legacy())).toEqual({
            active: true,
            usedRound: 2,
            lastKey: 'k',
            baseResistances: 2,
        });
        expect(resistSpentOf(legacy())).toBe(1);
    });

    it('upgrade moves the state into ext.lair and the spent count into legendary', () => {
        const p = legacy();

        const upgraded = upgradeLairState(p.battleData);

        expect('lair' in upgraded).toBe(false);
        expect(upgraded.legendary?.resistSpent).toBe(1);

        const next = { ...p, battleData: upgraded };

        expect(lairStateOf(next)).toEqual(lairStateOf(p));
        expect(resistSpentOf(next)).toBe(1);
        expect(d20State(next)).toEqual({});
    });

    it('upgrade leaves an already upgraded state alone', () => {
        const once = upgradeLairState(legacy().battleData);

        expect(upgradeLairState(once)).toBe(once);
    });

    it('toggle writes ext only and restores the pool from the spent count', () => {
        const on = LAIR_RULES.toggle(
            { ...legacy(), battleData: upgradeLairState(legacy().battleData) },
            false
        );

        expect('lair' in on.battleData).toBe(false);
        expect(LAIR_RULES.active(on)).toBe(false);
        expect(on.battleData.legendary?.resistLeft).toBe(1);
    });
});

describe('lair module composition', () => {
    it('only a composition with the module has lair rules', () => {
        expect(lairOf(dnd5eRules())).toBe(LAIR_RULES);
        expect(lairOf(bareD20Rules()).present(legacy())).toBe(false);
        expect(lairOf(bareD20Rules()).abilities(legacy())).toEqual([]);
    });

    it('a system without the module leaves toggles and spends as no-ops', () => {
        const p = legacy();

        const none = lairOf(bareD20Rules());

        expect(none.toggle(p, false)).toBe(p);
        expect(none.spend(p, 3, 'k')).toBe(p);
        expect(none.blocker(p, 3, 'k')).toBeNull();
    });
});
