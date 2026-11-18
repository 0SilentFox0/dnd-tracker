import { ABILITIES, DESCRIPTION, ICON, NAME } from '../common';
import type { Pair, PerField } from '../types';

export const fieldAliases: PerField<readonly string[]> = {
    name: NAME,
    description: DESCRIPTION,
    rarity: ['рідкість', 'rarity'],
    slot: ['слот', 'slot', 'тип'],
    setId: ['сет', 'set', 'комплект'],
    icon: ICON,
    weapon: ['зброя (json)', 'weapon', 'weapon (json)'],
    armor: ['броня (json)', 'armor', 'armor (json)'],
    item: ['предмет 5e (json)', 'item', 'item 5e (json)'],
    systemStats: [
        'системні характеристики (json)',
        'system stats (json)',
        'system stats',
    ],
    abilities: ABILITIES,
};

export const neutralExamples: PerField<Pair> = {
    weapon: [
        '{"damageDice":"1d8","damageType":"slashing","attackType":"melee"}',
        '',
    ],
    item: [
        '{"unique":false}',
        '{"unique":false,"attunement":true,"charges":{"max":7,"rest":"long"}}',
    ],
};

export const ukExamples: PerField<Pair> = {
    name: ['Меч Дракона', 'Кільце захисту'],
    description: ['Старовинний меч', '+1 до КД'],
    rarity: ['Рідкісний', 'Незвичайний'],
    slot: ['Зброя', 'Кільце'],
};

export const enExamples: PerField<Pair> = {
    name: ['Dragon Sword', 'Ring of Protection'],
    description: ['An ancient sword', '+1 AC'],
    rarity: ['rare', 'uncommon'],
    slot: ['weapon', 'ring'],
};
