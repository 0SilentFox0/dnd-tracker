import { DESCRIPTION, ICON, NAME } from '../common';
import type { Pair, PerField } from '../types';

export const fieldAliases: PerField<readonly string[]> = {
    name: NAME,
    icon: ICON,
    description: DESCRIPTION,
    choices: ['вибори (json)', 'choices', 'вибори', 'choices (json)'],
    originFeatId: [
        'риса походження',
        'originfeatid',
        'originfeat',
        'origin feat',
    ],
    skillProficiencies: [
        'навички (json)',
        'skillproficiencies',
        'навички',
        'skills (json)',
    ],
    toolProficiencies: [
        'інструменти (json)',
        'toolproficiencies',
        'інструменти',
        'tools (json)',
    ],
    equipmentText: [
        'спорядження (видає дм)',
        'equipmenttext',
        'спорядження',
        'equipment (given by the dm)',
    ],
};

export const neutralExamples: PerField<Pair> = {
    skillProficiencies: [
        '["arcana","history"]',
        '["athletics","intimidation"]',
    ],
};

export const ukExamples: PerField<Pair> = { name: ['Sage', 'Soldier'] };

export const enExamples: PerField<Pair> = { name: ['Sage', 'Soldier'] };
