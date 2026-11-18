import { ABILITIES, DESCRIPTION, ICON, NAME } from '../common';
import type { Pair, PerField } from '../types';

export const fieldAliases: PerField<readonly string[]> = {
    name: NAME,
    description: DESCRIPTION,
    setBonus: ['бонус сету (json)', 'set bonus', 'бонус', 'set bonus (json)'],
    abilities: ABILITIES,
    artifactIds: ['артефакти', 'artifacts'],
    icon: ICON,
};

export const neutralExamples: PerField<Pair> = {};

export const ukExamples: PerField<Pair> = {
    name: ['Обладунки Дракона', 'Регалії Мага'],
    setBonus: [
        '{"name":"Драконяча кров","description":"+2 до КД за повний комплект"}',
        '',
    ],
};

export const enExamples: PerField<Pair> = {
    name: ['Dragon Armor', 'Mage Regalia'],
    setBonus: [
        '{"name":"Dragon Blood","description":"+2 AC for the full set"}',
        '',
    ],
};
