import type { CharacteristicKey } from '../characteristics/keys';

export const STAT_FLOOR = 20;

export type SpeciesProfile = {
    mods: Partial<Record<CharacteristicKey, number>>;
    move: number;
    fate: number;
    fortune?: number;
    extraWounds: number;
    talents: string[];
    /** canon5e: each group is an "X or Y" starting talent; one is picked per group */
    talentChoices?: string[][];
    randomTalentCount: number;
    randomTalents: { max: number; featId: string }[];
    careerTable: { max: number; careerId: string }[];
    /** canon5e: `count` free skill purchases among `options` (skill advance keys) */
    skillPicks?: { count: number; options: string[] };
    /** canon5e: language skill keys the species knows; each starts fluent at +30 (6 purchases) */
    languages?: string[];
};

export const isUsableProfile = (p: SpeciesProfile): boolean =>
    p.careerTable.length > 0;
