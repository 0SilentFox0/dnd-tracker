export const STAT_COLUMNS = [
    'strength',
    'dexterity',
    'constitution',
    'intelligence',
    'wisdom',
    'charisma',
] as const;

export const CHARACTER_SYSTEM_COLUMNS = [
    ...STAT_COLUMNS,
    'armorClass',
    'archetype',
    'personalSkillId',
    'class',
    'subclass',
    'classes',
    'initiative',
    'speed',
    'level',
] as const;

export type CharacterSystemColumn = (typeof CHARACTER_SYSTEM_COLUMNS)[number];
