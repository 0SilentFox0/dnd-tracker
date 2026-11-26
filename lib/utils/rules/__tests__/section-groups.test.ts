import { describe, expect, it } from 'vitest';

import { allSections } from '../section-registry';
import { RULES_SECTION_GROUPS } from '../sections';

describe('rules section groups', () => {
    it('every group value is a known one', () => {
        for (const section of Object.values(allSections()))
            if (section.group)
                expect(RULES_SECTION_GROUPS).toContain(section.group);
    });

    it('mechanic sections are grouped by their owner, core stays system-agnostic', () => {
        const sections = allSections();

        expect(sections.initiative.group).toBe('combat');
        expect(sections.advancement.group).toBe('characters');
        expect(sections.outOfCombat.group).toBe('world');
        expect(sections.system.group).toBe('system');
    });

    it('ungrouped mechanic sections fall into "other" (no hidden group)', () => {
        const ungrouped = Object.entries(allSections()).filter(
            ([, s]) => s.mechanic && !s.group
        );

        expect(ungrouped).toEqual([]);
    });
});
