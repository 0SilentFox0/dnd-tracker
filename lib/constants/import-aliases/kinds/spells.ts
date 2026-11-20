import { DESCRIPTION, ICON, NAME } from '../common';
import type { Pair, PerField } from '../types';

export const fieldAliases: PerField<readonly string[]> = {
    name: NAME,
    level: ['коло', 'рівень', 'круг', 'level'],
    groupId: ['школа', 'школа магії', 'school', 'група', 'group'],
    description: DESCRIPTION,
    appearanceDescription: [
        'опис вигляду',
        'appearance',
        'appearance description',
    ],
    icon: ICON,
    cost: ['вартість', 'дія', 'casting time', 'час накладання'],
    casting: ['час накладання (json)', 'casting', 'casting time (json)'],
    componentFlags: [
        'прапорці компонентів (json)',
        'component flags',
        'component flags (json)',
    ],
    ingredients: ['інгредієнти (json)', 'ingredients', 'ingredients (json)'],
    dice: ['кістки', 'кубики', 'damage', 'шкода'],
    dieSides: ['грань кубика', 'die', 'грань', 'die sides'],
    executionMode: ['режим виконання', 'execution mode'],
    concentration: ['концентрація'],
    ritual: ['ритуал', 'ritual'],
    stackable: ['стакається'],
    maxStacks: ['макс. стаків', 'max stacks'],
    upcastDice: ['кістки за коло', 'upcast', 'upcast dice'],
    upcastTargets: ['цілі за коло', 'upcast targets'],
    addAbilityMod: ['додавати модифікатор', 'add ability modifier'],
    fixedDice: ['фіксовані кубики', 'fixed dice'],
    damageBonus: ['бонус шкоди', 'damage bonus'],
    targeting: ['ціль (json)', 'ціль', 'target', 'target (json)'],
    resolution: ['кидок (json)', 'кидок', 'roll (json)'],
    spellEffects: ['ефекти (json)', 'ефекти', 'effects', 'effects (json)'],
    raceModifiers: ['модифікатори рас (json)', 'race modifiers (json)'],
    fx: ['візуальний ефект (json)', 'visual effect (json)'],
    lists: ['списки', 'lists', 'spell lists'],
};

export const neutralExamples: PerField<Pair> = {
    level: ['3', '1'],
    dice: ['8d6', '1d8'],
    upcastDice: ['1', '1'],
    damageBonus: ['', '2'],
    targeting: [
        '{"kind":"template","shape":"circle","size":20,"side":"enemy","maxTargets":6}',
        '{"kind":"ally","range":5}',
    ],
    resolution: [
        '{"kind":"save","ability":"dexterity","onSuccess":"half"}',
        '{"kind":"auto"}',
    ],
    spellEffects: ['[]', '[]'],
    lists: ['Wizard, Sorcerer', 'Cleric'],
};

export const ukExamples: PerField<Pair> = {
    name: ['Вогняна куля', 'Лікування ран'],
    description: ["Вибух полум'я радіусом 20 футів", 'Відновлює хіти дотиком'],
    cost: ['Дія', 'Бонусна дія'],
    concentration: ['ні', 'ні'],
    stackable: ['ні', 'ні'],
    addAbilityMod: ['ні', 'так'],
    fixedDice: ['ні', 'так'],
};

export const enExamples: PerField<Pair> = {
    name: ['Fireball', 'Cure Wounds'],
    description: [
        'A burst of flame in a 20-foot radius',
        'Restores hit points by touch',
    ],
    cost: ['Action', 'Bonus action'],
    concentration: ['no', 'no'],
    stackable: ['no', 'no'],
    addAbilityMod: ['no', 'yes'],
    fixedDice: ['no', 'yes'],
};
