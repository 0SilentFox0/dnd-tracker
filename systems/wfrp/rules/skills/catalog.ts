import type { CharacteristicKey } from '../characteristics/keys';

export interface SkillDef {
    key: string;
    characteristic: CharacteristicKey;
    kind: 'basic' | 'advanced';
    spec: 'none' | 'fixed' | 'open';
    specs?: readonly string[];
    basicSpecs?: readonly string[];
    specOptional?: boolean;
}

const basic = (key: string, characteristic: CharacteristicKey): SkillDef => ({
    key,
    characteristic,
    kind: 'basic',
    spec: 'none',
});

const advanced = (
    key: string,
    characteristic: CharacteristicKey
): SkillDef => ({ key, characteristic, kind: 'advanced', spec: 'none' });

const open = (
    key: string,
    characteristic: CharacteristicKey,
    kind: SkillDef['kind'] = 'advanced'
): SkillDef => ({
    key,
    characteristic,
    kind,
    spec: 'open',
});

const grouped = (
    key: string,
    characteristic: CharacteristicKey,
    kind: SkillDef['kind'],
    specs: readonly string[]
): SkillDef => ({
    key,
    characteristic,
    kind,
    spec: 'fixed',
    specs,
    specOptional: true,
});

export const MELEE_SPECS = [
    'basic',
    'cavalry',
    'fencing',
    'flail',
    'polearm',
    'two-handed',
    'brawling',
] as const;

export const ENTERTAIN_SPECS = [
    'acting',
    'comedy',
    'singing',
    'storytelling',
] as const;

export const RIDE_SPECS = ['horse', 'mule', 'griffon', 'pegasus'] as const;

export const STEALTH_SPECS = ['rural', 'underground', 'urban'] as const;

export const ANIMAL_TRAINING_SPECS = [
    'dog',
    'hawk',
    'horse',
    'pigeon',
    'boar',
] as const;

export const CHANNELLING_SPECS = [
    'ember',
    'gale',
    'tide',
    'stone',
    'thorn',
    'frost',
    'dusk',
    'dawn',
    'ash',
    'magic',
] as const;

export const SIGNS_SPECS = [
    'guild',
    'ranger',
    'scout',
    'thief',
    'vagabond',
    'warden',
] as const;

export const RANGED_SPECS = [
    'bow',
    'crossbow',
    'blackpowder',
    'engineering',
    'entangling',
    'explosives',
    'sling',
    'throwing',
] as const;

export const SKILL_CATALOG: readonly SkillDef[] = [
    basic('athletics', 'ag'),
    basic('charm', 'fel'),
    basic('climb', 's'),
    basic('cool', 'wp'),
    basic('drink', 't'),
    basic('dodge', 'ag'),
    basic('drive', 'ag'),
    basic('endurance', 't'),
    grouped('entertain', 'fel', 'basic', ENTERTAIN_SPECS),
    basic('gamble', 'int'),
    basic('gossip', 'fel'),
    basic('haggle', 'fel'),
    basic('intimidate', 's'),
    basic('intuition', 'i'),
    basic('leadership', 'fel'),
    basic('navigation', 'i'),
    basic('survival', 'int'),
    basic('perception', 'i'),
    grouped('ride', 'ag', 'basic', RIDE_SPECS),
    basic('row', 's'),
    grouped('stealth', 'ag', 'basic', STEALTH_SPECS),
    basic('bribery', 'fel'),
    basic('charm-animal', 'wp'),
    {
        key: 'melee',
        characteristic: 'ws',
        kind: 'basic',
        spec: 'fixed',
        specs: MELEE_SPECS,
        basicSpecs: ['basic'],
    },
    {
        key: 'ranged',
        characteristic: 'bs',
        kind: 'advanced',
        spec: 'fixed',
        specs: RANGED_SPECS,
    },
    advanced('animal-care', 'int'),
    grouped('animal-training', 'int', 'advanced', ANIMAL_TRAINING_SPECS),
    advanced('swim', 's'),
    advanced('sail', 'ag'),
    grouped('channelling', 'wp', 'advanced', CHANNELLING_SPECS),
    advanced('evaluate', 'int'),
    advanced('heal', 'int'),
    advanced('lockpicking', 'dex'),
    advanced('pray', 'fel'),
    advanced('research', 'int'),
    grouped('signs', 'int', 'advanced', SIGNS_SPECS),
    advanced('traps', 'dex'),
    advanced('sleight-of-hand', 'dex'),
    advanced('track', 'i'),
    open('lore', 'int'),
    open('language', 'int'),
    open('trade', 'dex'),
    open('art', 'dex', 'basic'),
    open('performance', 'ag'),
    open('play', 'dex'),
];

export const skillDef = (key: string): SkillDef | undefined =>
    SKILL_CATALOG.find((s) => s.key === key);

export const skillAdvanceKey = (key: string, spec?: string): string =>
    spec ? `${key}:${spec}` : key;

export function parseSkillAdvanceKey(advanceKey: string): {
    key: string;
    spec?: string;
} {
    const [key, spec] = advanceKey.split(':');

    return spec ? { key, spec } : { key };
}
