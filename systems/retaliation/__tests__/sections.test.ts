import { describe, expect, it } from 'vitest';

import {
    bareD20Rules,
    dnd5eRules,
} from '@/lib/__tests__/helpers/dnd5e-modules';
import { sectionsOfSystem } from '@/lib/utils/rules/section-registry';

const actionItems = (rules: { system: { key: string; modules?: string[] } }) =>
    Object.keys(sectionsOfSystem(rules.system).actions.items);

describe('actions items owned by the modules', () => {
    it('the modules add their items with default true', () => {
        const { items } = sectionsOfSystem({
            key: 'dnd5e',
            modules: ['opportunity', 'retaliation'],
        }).actions;

        expect(items.opportunityAttacks.default).toBe(true);
        expect(items.retaliation.default).toBe(true);
    });

    it('bare d20 has neither item', () => {
        expect(actionItems(bareD20Rules())).not.toContain('retaliation');
        expect(actionItems(bareD20Rules())).not.toContain('opportunityAttacks');
        expect(actionItems(dnd5eRules())).toContain('opportunityAttacks');
    });
});
