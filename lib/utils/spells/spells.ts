import { UNGROUPED_KEY } from '@/lib/constants/ungrouped';
import { groupBy } from '@/lib/utils/common/collections';
import type { Spell } from '@/types/spells';

export function groupSpellsByGroup(spells: Spell[]): Map<string, Spell[]> {
    const grouped = groupBy(
        spells,
        (spell) => spell.spellGroup?.name || UNGROUPED_KEY
    );

    grouped.forEach((groupSpells) => {
        groupSpells.sort((a, b) => {
            if (a.level !== b.level) return a.level - b.level;

            return a.name.localeCompare(b.name);
        });
    });

    return grouped;
}

export function groupSpellsByGroupAndLevel(
    spells: Spell[]
): Map<string, Map<number, Spell[]>> {
    const groupedSpellsMap = new Map<string, Map<number, Spell[]>>();

    for (const [groupName, groupSpells] of groupBy(
        spells,
        (spell) => spell.spellGroup?.name || UNGROUPED_KEY
    )) {
        groupedSpellsMap.set(
            groupName,
            groupBy(groupSpells, (spell) => spell.level)
        );
    }

    groupedSpellsMap.forEach((levelMap) => {
        levelMap.forEach((levelSpells) => {
            levelSpells.sort((a, b) => a.name.localeCompare(b.name));
        });
    });

    return groupedSpellsMap;
}

export function sortSpellLevels(
    levels: [number, Spell[]][]
): [number, Spell[]][] {
    return [...levels].sort(([levelA], [levelB]) => levelA - levelB);
}

export function convertGroupedSpellsToArray(
    groupedSpellsMap: Map<string, Map<number, Spell[]>>
): [string, [number, Spell[]][]][] {
    return Array.from(groupedSpellsMap.entries()).map(
        ([groupName, levelMap]) => {
            const sortedLevels = sortSpellLevels(
                Array.from(levelMap.entries())
            );

            return [groupName, sortedLevels] as [string, [number, Spell[]][]];
        }
    );
}

export function filterSelectedSpells(
    spells: Spell[],
    selectedSpellIds: string[]
): Spell[] {
    return spells.filter((spell) => selectedSpellIds.includes(spell.id));
}

export function calculateTotalSpellsInGroup(
    levels: [number, Spell[]][]
): number {
    return levels.reduce((sum, [, spells]) => sum + spells.length, 0);
}
