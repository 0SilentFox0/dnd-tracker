import { ABILITIES, DESCRIPTION, ICON, NAME } from '../common';
import type { Pair, PerField } from '../types';

export const fieldAliases: PerField<readonly string[]> = {
    name: NAME,
    description: DESCRIPTION,
    appearanceDescription: [
        'опис вигляду',
        'appearance',
        'appearance description',
    ],
    icon: ICON,
    image: ['зображення', 'image'],
    mainSkillId: ['основний скіл', 'гілка', 'main skill'],
    spellId: ['заклинання', 'spell'],
    spellGroupId: ['школа магії', 'школа', 'spell group', 'spell school'],
    grantedSpellId: ['дає заклинання', 'granted spell', 'grants spell'],
    abilities: ABILITIES,
};

export const neutralExamples: PerField<Pair> = {};

export const ukExamples: PerField<Pair> = {
    name: ['Стійкість', 'Майстер меча'],
    description: ['+1 до КД', 'Додаткова атака мечем'],
    abilities: ['Стійкість: +1 до КД', ''],
};

export const enExamples: PerField<Pair> = {
    name: ['Resilience', 'Sword Master'],
    description: ['+1 AC', 'Extra sword attack'],
    abilities: ['Resilience: +1 AC', ''],
};
