import { describe, expect, it } from 'vitest';

import { sectionsOfComposition } from '@/lib/utils/rules/section-registry';
import {
    type Composition,
    kindOf,
    moduleMetaOf,
} from '@/lib/utils/rules/systems/catalog';
import { RULES_PRESETS } from '@/lib/utils/rules/systems/rules-presets';

const compositionOf = (id: string): Composition | undefined => {
    const meta = moduleMetaOf(id);

    if (!meta) return undefined;

    if (kindOf(meta) === 'base') return { base: id, modules: [] };

    return meta.preset && { ...meta.preset };
};

describe('rules presets', () => {
    it('are keyed by modules that have a meta', () => {
        for (const id of Object.keys(RULES_PRESETS))
            expect(moduleMetaOf(id), id).toBeDefined();
    });

    it.each(Object.entries(RULES_PRESETS))(
        '%s sets only valid items of its own composition',
        (id, preset) => {
            const c = compositionOf(id);

            expect(c, `${id} is a base or a preset`).toBeDefined();

            const sections = sectionsOfComposition(c as Composition);

            for (const [section, items] of Object.entries(preset))
                for (const [item, value] of Object.entries(items)) {
                    const rule = sections[section]?.items[item];

                    expect(rule, `${id}: ${section}.${item}`).toBeDefined();
                    expect(
                        rule.schema.safeParse(value).success,
                        `${id}: ${section}.${item} value`
                    ).toBe(true);
                }
        }
    );
});
