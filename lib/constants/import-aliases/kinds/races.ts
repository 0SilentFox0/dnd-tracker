import { ABILITIES, COLOR, ICON, NAME } from '../common';
import type { Pair, PerField } from '../types';

export const fieldAliases: PerField<readonly string[]> = {
    name: NAME,
    icon: ICON,
    color: COLOR,
    availableSkills: [
        'доступні основні скіли',
        'available skills',
        'основні скіли',
        'available main skills',
    ],
    disabledSkills: ['заборонені скіли', 'disabled skills'],
    passiveAbility: [
        'пасивна здібність (json)',
        'passive ability',
        'passive ability (json)',
    ],
    spellSlotProgression: [
        'слоти заклинань (json)',
        'слоти',
        'spell slots (json)',
    ],
    choices: [
        'вибори (json)',
        'choices',
        'вибори',
        'лінії',
        'lineages',
        'choices (json)',
    ],
    abilities: ABILITIES,
};

export const neutralExamples: PerField<Pair> = {
    color: ['#2e8b57', '#b8860b'],
    spellSlotProgression: ['[{"level":1,"slots":2}]', ''],
    choices: ['[]', ''],
};

export const ukExamples: PerField<Pair> = {
    name: ['Ельфи', 'Гноми'],
    passiveAbility: [
        '{"name":"Лісова стежка","description":"Швидкість +10 у лісі"}',
        '',
    ],
};

export const enExamples: PerField<Pair> = {
    name: ['Elves', 'Gnomes'],
    passiveAbility: [
        '{"name":"Forest Path","description":"Speed +10 in forests"}',
        '',
    ],
};
