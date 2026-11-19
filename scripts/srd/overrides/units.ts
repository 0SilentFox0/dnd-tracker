import type { UnitRow } from '../lib/types';

export const UNIT_OVERRIDES: Record<
    string,
    Partial<
        Pick<
            UnitRow,
            | 'multiattack'
            | 'legendaryActions'
            | 'legendaryResistances'
            | 'constitution'
            | 'charisma'
            | 'saveProficiencies'
        >
    >
> = {
    // «as many Bite attacks as it has heads» — starts with five heads
    'srd-2024_hydra': { multiattack: 5 },
    // Open5e carries Con 0 / Cha −3 with a +30 Con save; SRD 5.2 has Con 11, Cha 4 and no save proficiencies
    'srd-2024_octopus': {
        constitution: 11,
        charisma: 4,
        saveProficiencies: [],
    },
};

interface DamageTraits {
    vulnerabilities?: string[];
    resistances?: string[];
    immunities?: string[];
}

const SWARM_RESISTANCES = ['bludgeoning', 'piercing', 'slashing'];

/** SRD 5.2 statblock damage traits the Open5e feed leaves empty; merged with the feed lists. */
export const UNIT_DAMAGE_OVERRIDES: Record<string, DamageTraits> = {
    'srd-2024_skeleton': { vulnerabilities: ['bludgeoning'] },
    'srd-2024_minotaur-skeleton': { vulnerabilities: ['bludgeoning'] },
    'srd-2024_warhorse-skeleton': { vulnerabilities: ['bludgeoning'] },
    'srd-2024_mummy': { vulnerabilities: ['fire'] },
    'srd-2024_mummy-lord': { vulnerabilities: ['fire'] },
    'srd-2024_treant': {
        vulnerabilities: ['fire'],
        resistances: ['bludgeoning', 'piercing'],
    },
    'srd-2024_awakened-tree': {
        vulnerabilities: ['fire'],
        resistances: ['bludgeoning', 'piercing'],
    },
    'srd-2024_awakened-shrub': {
        vulnerabilities: ['fire'],
        resistances: ['piercing'],
    },
    'srd-2024_dust-mephit': { vulnerabilities: ['fire'] },
    'srd-2024_ice-mephit': { vulnerabilities: ['bludgeoning', 'fire'] },
    'srd-2024_magma-mephit': { vulnerabilities: ['cold'] },
    'srd-2024_salamander': { vulnerabilities: ['cold'] },
    'srd-2024_shadow': { vulnerabilities: ['radiant'] },
    'srd-2024_swarm-of-bats': { resistances: SWARM_RESISTANCES },
    'srd-2024_swarm-of-insects': { resistances: SWARM_RESISTANCES },
    'srd-2024_swarm-of-piranhas': { resistances: SWARM_RESISTANCES },
    'srd-2024_swarm-of-rats': { resistances: SWARM_RESISTANCES },
    'srd-2024_swarm-of-ravens': { resistances: SWARM_RESISTANCES },
    'srd-2024_swarm-of-venomous-snakes': { resistances: SWARM_RESISTANCES },
};
