import { NAME } from '../common';
import type { Pair, PerField } from '../types';

export const fieldAliases: PerField<readonly string[]> = {
    name: NAME,
    level: ['рівень', 'tier', 'тір', 'level'],
    raceId: ['раса', 'група', 'group', 'race'],
    avatar: ['аватар', 'image', 'url', 'зображення'],
    initiative: ['ініціатива', 'init'],
    armorClass: ['кд', 'ac', 'клас броні', 'armor class'],
    maxHp: ['хп', 'hp', 'хіти', 'hit points', 'hp_avg'],
    speed: ['швидкість'],
    strength: ['сил', 'str', 'сила'],
    dexterity: ['лов', 'спр', 'dex', 'спритність'],
    constitution: ['тіл', 'con', 'статура'],
    intelligence: ['інт', 'int', 'інтелект'],
    wisdom: ['мдр', 'муд', 'wis', 'мудрість'],
    charisma: ['хар', 'cha', 'харизма'],
    attacks: ['атаки', 'атака'],
    abilities: [
        'навички/здібності',
        'особливості',
        'features',
        'здібності',
        'traits',
        'traits/abilities',
    ],
    immunities: ['імунітети', 'імунітет'],
    knownSpells: ['заклинання', 'spells', 'known spells'],
    statblock: ['статблок (json)', 'statblock', 'statblock (json)'],
    characteristics: [
        'характеристики (json)',
        'characteristics',
        'characteristics (json)',
    ],
    spellcasting: [
        'заклинання монстра (json)',
        'spellcasting',
        'monster spellcasting (json)',
    ],
    proficiencyBonus: ['майстерність', 'proficiency', 'бонус майстерності'],
    gridSize: ['розмір на мапі', 'клітинок', 'map size'],
    morale: ['мораль'],
    minTargets: ['мін. цілей', 'min targets'],
    maxTargets: ['макс. цілей', 'max targets'],
    cr: ['небезпека', 'рівень небезпеки', 'challenge'],
    xp: ['досвід'],
    multiattack: ['мультиатака', 'атак за дію'],
    legendaryActions: ['легендарні дії', 'legendary actions'],
    legendaryResistances: [
        'легендарний опір',
        'legendary resistance',
        'legendary resistances',
    ],
    saveProficiencies: [
        'рятівні кидки',
        'save proficiencies',
        'saving throw proficiencies',
        'saving throws',
    ],
};

export const neutralExamples: PerField<Pair> = {
    level: ['1', '2'],
    initiative: ['2', '3'],
    armorClass: ['13', '13'],
    speed: ['30', '40'],
    dexterity: ['14', '15'],
    constitution: ['10', '12'],
    intelligence: ['10', '3'],
    wisdom: ['8', '12'],
    charisma: ['8', '6'],
    immunities: ['', 'poison'],
    gridSize: ['1', '1'],
    morale: ['0', '1'],
    minTargets: ['1', '1'],
    maxTargets: ['1', '1'],
    cr: ['1/4', '1/4'],
    multiattack: ['1', '1'],
    legendaryActions: ['0', '0'],
    legendaryResistances: ['0', '0'],
    saveProficiencies: ['', 'dexterity, wisdom'],
};

export const ukExamples: PerField<Pair> = {
    name: ['Гоблін-лучник', 'Вовк'],
    maxHp: ['7 (2к6)', '11 (2к8 + 2)'],
    strength: ['8 (-1)', '12'],
    attacks: ['Короткий лук +4, 1к6+2 колючий', 'Укус +4, 2к4+2 колючий'],
    abilities: [
        'Втеча: бонусною дією відходить або ховається',
        'Зграя: перевага на атаку, якщо поруч союзник',
    ],
};

export const enExamples: PerField<Pair> = {
    name: ['Goblin Archer', 'Wolf'],
    maxHp: ['7 (2d6)', '11 (2d8 + 2)'],
    strength: ['8 (-1)', '12'],
    attacks: ['Shortbow +4, 1d6+2 piercing', 'Bite +4, 2d4+2 piercing'],
    abilities: [
        'Nimble Escape: moves away or hides as a bonus action',
        'Pack Tactics: advantage on attacks when an ally is nearby',
    ],
};
