import type { CorruptionSpecies } from './constants';

const MATCHERS: readonly [RegExp, CorruptionSpecies][] = [
    [/elf|elv/i, 'elf'],
    [/halfling/i, 'halfling'],
    [/dwarf|dwarv/i, 'dwarf'],
];

/** Canon species of a race: the template slug first, then the English name; anything unknown counts as human */
export const corruptionSpeciesOf = (
    race: { slug?: string | null; name?: string | null } | null | undefined
): CorruptionSpecies =>
    [race?.slug, race?.name].reduce<CorruptionSpecies | undefined>(
        (found, text) =>
            found ?? MATCHERS.find(([re]) => re.test(text ?? ''))?.[1],
        undefined
    ) ?? 'human';
