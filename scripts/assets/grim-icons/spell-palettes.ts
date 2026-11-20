import {
    GRIM_ARCANE_LISTS,
    GRIM_CORE_SPELL_LISTS,
    GRIM_CULT_LISTS,
    GRIM_DARK_LISTS,
} from '../../templates/systems/wfrp/spells';

export const SPELL_LIST_PALETTES: Record<string, string> = {
    Cantrips: 'neutral gold',
    'Common Arcana': 'neutral gold with violet arcane accents',
    'School of Embers': 'fire',
    'School of Gloam': 'desaturated shadow grey and necrotic violet',
    'School of Dusk': 'bone-white and violet',
    'School of Radiance': 'radiant',
    'School of Alloy': 'grey-bronze steel',
    'School of Verdance': 'nature',
    'School of Firmament': 'deep blue and silver',
    'School of Wilds': 'ochre and brown amber',
    Fenlore: 'murky marsh green',
    Thornwitchery: 'dark green and bruise purple',
    'Pact Rites': 'crimson and black',
    'Grave Rites': 'necrotic',
    'Hearth Rites': 'radiant',
    'Rites of the Tide': 'teal',
    'Rites of the Still Hour': 'pale silver necrotic',
    'Rites of the Banner': 'steel grey and gold',
    'Rites of the Gambler': 'neutral gold',
    'Rites of the Green Cradle': 'nature',
    'Rites of Mercy': 'soft white radiant',
    'Rites of the Forged Crown': 'radiant gold and ember',
    'Rites of the Deep Wood': 'forest green',
    'Rites of the Winter Wolf': 'ice blue',
    'Rites of the Scales': 'neutral gold',
    // not in the plan table; follows the forge theme of the Banner/Crown rites
    'Rites of the Forge-Fathers': 'steel grey and gold',
};

export const spellPaletteOf = (lists: readonly string[]): string =>
    SPELL_LIST_PALETTES[lists[0]] ?? 'radiant';

export const allGrimSpellLists = (): string[] => [
    ...new Set([
        ...Object.values(GRIM_CORE_SPELL_LISTS).flat(),
        ...GRIM_ARCANE_LISTS,
        ...GRIM_DARK_LISTS,
        ...GRIM_CULT_LISTS,
    ]),
];
