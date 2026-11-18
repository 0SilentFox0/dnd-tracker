import { COLOR, ICON, NAME } from '../common';
import type { Pair, PerField } from '../types';

export const fieldAliases: PerField<readonly string[]> = {
    name: NAME,
    icon: ICON,
    color: COLOR,
    hitDie: ['кістка хітів', 'hit die', 'hd', 'кістка'],
    savingThrows: ['рятівні кидки', 'saving throws', 'saves'],
    proficiencies: [
        'майстерності (json)',
        'proficiencies',
        'proficiencies (json)',
    ],
    skillChoices: [
        'вибір навичок (json)',
        'skill choices',
        'skill choices (json)',
    ],
    caster: ['тип заклинача', 'caster', 'заклинач', 'caster type'],
    spellcastingAbility: ['характеристика заклинань', 'spellcasting ability'],
    features: [
        'вміння за рівнями (json)',
        'features',
        'вміння',
        'features by level (json)',
    ],
    subclassLevel: ['рівень підкласу', 'subclass level'],
    subclasses: ['підкласи (json)', 'subclasses', 'subclasses (json)'],
    columns: [
        'таблиця класу (json)',
        'columns',
        'class table',
        'class table (json)',
    ],
    spellList: ['список заклинань', 'spell list'],
};

export const neutralExamples: PerField<Pair> = {
    color: ['#8b0000', '#1e3a8a'],
    hitDie: ['10', '6'],
    savingThrows: ['strength, constitution', 'intelligence, wisdom'],
    skillChoices: [
        '{"count":2,"from":["athletics","perception"]}',
        '{"count":2,"from":["arcana","history"]}',
    ],
    spellcastingAbility: ['', 'intelligence'],
    features: ['[]', '[]'],
    subclassLevel: ['3', '2'],
    subclasses: ['[]', '[]'],
    columns: ['[]', '[]'],
    spellList: ['', 'Wizard'],
};

export const ukExamples: PerField<Pair> = {
    name: ['Воїн', 'Чарівник'],
    proficiencies: [
        '{"armor":["усі обладунки","щити"],"weapons":["прості","бойові"],"tools":[]}',
        '{"armor":[],"weapons":["кинджали"],"tools":[]}',
    ],
    caster: ['Не заклинач', 'Повний заклинач'],
};

export const enExamples: PerField<Pair> = {
    name: ['Fighter', 'Wizard'],
    proficiencies: [
        '{"armor":["all armor","shields"],"weapons":["simple","martial"],"tools":[]}',
        '{"armor":[],"weapons":["daggers"],"tools":[]}',
    ],
    caster: ['none', 'full'],
};
