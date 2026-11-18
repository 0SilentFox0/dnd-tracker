import { COLOR, ICON, NAME } from '../common';
import type { Pair, PerField } from '../types';

export const fieldAliases: PerField<readonly string[]> = {
    name: NAME,
    color: COLOR,
    icon: ICON,
};

export const neutralExamples: PerField<Pair> = {
    color: ['#e25822', '#f5d76e'],
    icon: ['flame', 'sun'],
};

export const ukExamples: PerField<Pair> = {
    name: ['Магія Хаосу', 'Магія Світла'],
};

export const enExamples: PerField<Pair> = {
    name: ['Chaos Magic', 'Light Magic'],
};
