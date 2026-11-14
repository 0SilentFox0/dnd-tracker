import { D20_META } from '@/systems/d20/meta';

export const D20_CHARACTERISTICS_COLUMNS = D20_META.characteristicsColumns;

export const D20_COLUMN_DEFAULTS: Readonly<Record<string, number>> = {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    armorClass: 10,
    initiative: 0,
    speed: 30,
};
