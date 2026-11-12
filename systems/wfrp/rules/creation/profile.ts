import type { CharacteristicKey } from '../characteristics/keys';

export const STAT_FLOOR = 20;

export type SpeciesProfile = {
    mods: Partial<Record<CharacteristicKey, number>>;
    move: number;
    fate: number;
    extraWounds: number;
    talents: string[];
    randomTalentCount: number;
    randomTalents: { max: number; featId: string }[];
    careerTable: { max: number; careerId: string }[];
};

export const isUsableProfile = (p: SpeciesProfile): boolean =>
    p.careerTable.length > 0;
