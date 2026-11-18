import { ABILITIES, DESCRIPTION, ICON, NAME } from '../common';
import type { Pair, PerField } from '../types';

export const fieldAliases: PerField<readonly string[]> = {
    name: NAME,
    icon: ICON,
    type: ['тип', 'type'],
    prerequisite: [
        'передумови (json)',
        'prerequisite',
        'передумова',
        'передумови',
        'prerequisites (json)',
    ],
    repeatable: ['повторювана', 'repeatable'],
    xpCost: ['ціна в досвіді', 'xp cost', 'xpcost'],
    maxRank: ['макс. ранг', 'max rank', 'maxrank'],
    description: DESCRIPTION,
    abilities: ABILITIES,
    choices: ['вибори (json)', 'choices', 'вибори', 'choices (json)'],
};

export const neutralExamples: PerField<Pair> = {
    prerequisite: ['{}', '{"level":4}'],
    choices: ['[]', '[]'],
};

export const ukExamples: PerField<Pair> = {
    name: ['Пильний', 'Влучний стрілець'],
    type: ['Походження', 'Стиль бою'],
    repeatable: ['ні', 'ні'],
    description: ['Майстерність до ініціативи', '+2 до дальніх атак'],
};

export const enExamples: PerField<Pair> = {
    name: ['Alert', 'Sharpshooter'],
    type: ['origin', 'fightingStyle'],
    repeatable: ['no', 'no'],
    description: ['Proficiency bonus to initiative', '+2 to ranged attacks'],
};
