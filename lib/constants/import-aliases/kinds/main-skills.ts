import { COLOR, ICON, NAME } from '../common';
import type { Pair, PerField } from '../types';

export const fieldAliases: PerField<readonly string[]> = {
    name: NAME,
    color: COLOR,
    icon: ICON,
    isEnableInSkillTree: [
        'у дереві скілів',
        'в дереві',
        'enabled',
        'in skill tree',
    ],
    spellGroupId: ['школа магії', 'школа', 'spell group', 'spell school'],
    role: ['роль', 'role'],
};

export const neutralExamples: PerField<Pair> = {
    color: ['#c0392b', '#f1c40f'],
};

export const ukExamples: PerField<Pair> = {
    name: ['Напад', 'Магія Світла'],
    isEnableInSkillTree: ['так', 'так'],
    role: ['Напад', 'Магія'],
};

export const enExamples: PerField<Pair> = {
    name: ['Offense', 'Light Magic'],
    isEnableInSkillTree: ['yes', 'yes'],
    role: ['attack', 'magic'],
};
