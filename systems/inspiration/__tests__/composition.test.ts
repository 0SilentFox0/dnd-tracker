import { describe, expect, it } from 'vitest';

import {
    bareD20Rules,
    dnd5eRules,
} from '@/lib/__tests__/helpers/dnd5e-modules';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { canUseInspiration } from '@/lib/utils/battle/attack/inspiration';
import {
    applyCharacterResources,
    battleResultOutcome,
} from '@/lib/utils/characters/resources/battle';
import type { Ruleset } from '@/lib/utils/rules';
import { rerollTokenOn, storedInspiration } from '@/lib/utils/rules/reroll-token-on';
import { parseRules } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { d20State, withD20State } from '@/systems/d20/rules/state';
import { setInspiration } from '@/systems/inspiration/server/set-inspiration';

const on = (rules: Ruleset): Ruleset => ({
    ...rules,
    outOfCombat: { ...rules.outOfCombat, inspiration: true },
});

const stored = { resources: null, inspiration: true };

describe('inspiration module composition', () => {
    it('the module adds the combat hook and both participant parts', () => {
        const { combat, participant } = ruleSystemOf(dnd5eRules());

        expect(combat.rerollToken).toBeDefined();
        expect(participant?.fromStored).toHaveLength(1);
        expect(participant?.persist).toHaveLength(1);
    });

    it('bare d20 has none of them', () => {
        const { combat, participant } = ruleSystemOf(bareD20Rules());

        expect(combat.rerollToken).toBeUndefined();
        expect(participant?.fromStored ?? []).toHaveLength(0);
        expect(participant?.persist ?? []).toHaveLength(0);
    });

    it('inspiration enters the battle only with the module', () => {
        const seed = (rules: Ruleset) =>
            applyCharacterResources(createMockParticipant(), stored, on(rules));

        expect(d20State(seed(dnd5eRules()))).toEqual({ inspiration: true });
        expect(seed(bareD20Rules()).battleData.system).toBeUndefined();
    });

    it('inspiration is usable and persisted only with the module', () => {
        const p = withD20State(createMockParticipant(), {
            inspiration: true,
            inspirationSpent: true,
        });

        expect(canUseInspiration(p, on(dnd5eRules()))).toBe(true);
        expect(canUseInspiration(p, on(bareD20Rules()))).toBe(false);
        expect(
            battleResultOutcome({}, p, on(dnd5eRules())).clearInspiration
        ).toBe(true);
        expect(
            battleResultOutcome({}, p, on(bareD20Rules())).clearInspiration
        ).toBeUndefined();
    });

    it('the sheet toggle is refused without the module', async () => {
        const gate = (rules: Ruleset) =>
            ({
                access: { campaign: { rules } },
                character: { id: 'c', campaignId: 'k' },
            }) as never;

        await expect(
            setInspiration(gate(on(bareD20Rules())), true)
        ).rejects.toMatchObject({ status: 409 });
    });

    it('the stored flag has no effect when the module is off', () => {
        const raw = (modules: string[]) =>
            parseRules({
                outOfCombat: { inspiration: true },
                system: { key: 'd20', modules },
            });

        expect(rerollTokenOn(raw([]))).toBe(false);
        expect(rerollTokenOn(raw(['inspiration']))).toBe(true);
    });

    it('the stored reader works through the core seam and is null when off', () => {
        const ext = {
            inspiration: false,
            characteristics: { ext: { inspiration: { available: true } } },
        };

        expect(storedInspiration(on(dnd5eRules()), ext)).toBe(true);
        expect(storedInspiration(on(dnd5eRules()), { inspiration: true })).toBe(
            true
        );
        expect(storedInspiration(bareD20Rules(), ext)).toBeNull();
    });

    it('wfrp has no token store, so its rows never get an ext slot', () => {
        const rules = parseRules({
            system: { key: 'wfrp' },
            outOfCombat: { inspiration: true },
        });

        expect(ruleSystemOf(rules).combat.rerollToken).toBeUndefined();
        expect(storedInspiration(rules, { inspiration: true })).toBeNull();
    });
});
