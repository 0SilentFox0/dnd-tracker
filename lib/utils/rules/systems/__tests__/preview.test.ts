import { describe, expect, it } from 'vitest';

import {
    composition,
    contentKindsOf,
    dmSectionsOf,
    moduleMetaOf,
} from '../catalog';
import { composeSystem, compositionOrder } from '../compose';
import { ruleSystemOf } from '../lookup';
import { previewComposition } from '../preview';
import { MODULES } from '../registry';
import type { RuleSystemDefinition } from '../types';

import { sectionsOfComposition } from '@/lib/utils/rules/section-registry';
import type { SystemSelection } from '@/lib/utils/rules/systems/catalog';

const composed = (system: SystemSelection): RuleSystemDefinition => {
    const { base, modules } = composition(system);

    return composeSystem(
        MODULES[base] as RuleSystemDefinition,
        compositionOrder(base, modules).map((id) => ({
            id,
            claims: moduleMetaOf(id)?.claims,
            build: MODULES[id] as never,
        }))
    );
};

describe('previewComposition', () => {
    it.each([
        ['homm', { key: 'homm' }],
        ['bare d20', { key: 'dnd5e', modules: [] }],
        ['wfrp', { key: 'wfrp' }],
    ])('equals composeSystem(base, modules) for %s', (_, system) => {
        const current: SystemSelection = { key: 'dnd5e', modules: ['morale'] };

        const preview = previewComposition(current, system);

        const expected = composed(system);

        const sections = sectionsOfComposition(composition(system));

        expect(preview.sheetBlocks).toBe(expected.sheet?.blocks.length ?? 0);
        expect(preview.actions).toEqual(
            Object.keys(expected.combat.actions.catalog).sort()
        );
        expect(preview.contentKinds).toEqual(
            [...contentKindsOf(system)].sort()
        );
        expect(preview.dmSections).toEqual([...dmSectionsOf(system)].sort());
        expect(preview.rulesSections).toEqual(
            Object.keys(sections).filter((key) => sections[key].mechanic)
        );
        expect(ruleSystemOf({ system }).sheet?.blocks.length ?? 0).toBe(
            preview.sheetBlocks
        );
    });

    it('lists added and removed modules against the current selection', () => {
        const preview = previewComposition(
            { key: 'dnd5e', modules: ['morale'] },
            { key: 'dnd5e', modules: ['retaliation'] }
        );

        expect(preview.added).toEqual(['retaliation']);
        expect(preview.removed).toEqual(['morale']);
    });
});
