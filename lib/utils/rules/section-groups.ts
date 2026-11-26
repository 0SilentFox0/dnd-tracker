import type { RulesGroup, SectionMap } from './sections';

export type SectionGroupId = RulesGroup | 'other';

export const SECTION_GROUP_ORDER: readonly SectionGroupId[] = [
    'system',
    'combat',
    'characters',
    'world',
    'other',
];

export function groupSectionKeys(
    keys: readonly string[],
    sections: SectionMap
): { group: SectionGroupId; keys: string[] }[] {
    return SECTION_GROUP_ORDER.map((group) => ({
        group,
        keys: keys.filter((key) => (sections[key]?.group ?? 'other') === group),
    })).filter(({ keys: inGroup }) => inGroup.length > 0);
}
