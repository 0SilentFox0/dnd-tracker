import { LOCALIZED, NEUTRAL } from './kinds';
import type { Pair, PerField } from './types';

import type { Locale } from '@/lib/i18n/config';
import type { ImportKind } from '@/types/content-import';

export {
    CAREER_TIER_COUNT,
    CAREER_TIER_PARTS,
    careerTierKey,
    type CareerTierPart,
} from './common';
export { FIELD_ALIASES } from './kinds';

export const NUMBER_WORDS: Record<
    ImportKind,
    PerField<Readonly<Record<string, number>>>
> = {
    units: {},
    spells: {
        level: { cantrip: 0, замовляння: 0, заговір: 0, 'заговір (0)': 0 },
    },
    skills: {},
    'main-skills': {},
    'spell-groups': {},
    races: {},
    classes: {},
    feats: {},
    backgrounds: {},
    careers: {},
    artifacts: {},
    'artifact-sets': {},
};

export const ENUM_LABELS: Partial<
    Record<ImportKind, PerField<Readonly<Record<string, readonly string[]>>>>
> = {
    artifacts: {
        rarity: {
            common: ['Звичайний'],
            uncommon: ['Незвичайний'],
            rare: ['Рідкісний'],
            epic: ['Епічний'],
            legendary: ['Легендарний'],
        },
        slot: {
            weapon: ['Зброя'],
            range_weapon: ['Дальнобійна зброя'],
            shield: ['Щит'],
            cloak: ['Плащ'],
            ring: ['Кільце'],
            helmet: ['Шолом'],
            amulet: ['Амулет'],
            armor: ['Броня'],
            boots: ['Черевики'],
            item: ['Артефакт'],
        },
    },
    classes: {
        caster: {
            none: ['Не заклинач'],
            full: ['Повний заклинач'],
            half: ['Половинний заклинач'],
            third: ['Третина заклинача'],
            pact: ['Пакт'],
        },
    },
    feats: {
        type: {
            origin: ['Походження'],
            general: ['Загальна'],
            fightingStyle: ['Стиль бою'],
            epicBoon: ['Епічний дар'],
        },
    },
    'main-skills': {
        role: {
            attack: ['Напад'],
            ranged: ['Стрільба'],
            defense: ['Захист'],
            magic: ['Магія'],
            leadership: ['Лідерство'],
            race: ['Раса'],
            ultimate: ['Ультимат'],
            personal: ['Персональні'],
        },
    },
    spells: {
        cost: {
            reaction: ['Реакція', 'reaction', '1 reaction'],
            long: ['Тривале накладання', 'long'],
            action: ['Дія', '1 дія', 'action', '1 action', 'дією'],
            bonusAction: [
                'Бонусна дія',
                'bonus action',
                '1 bonus action',
                'бонус',
                'бонусною дією',
                '1 бонусна дія',
            ],
        },
    },
};

// uk ability names and short forms accepted by the CSV import; the English abbreviation always matches too
export const ABILITY_IMPORT_LABELS: Readonly<
    Record<string, readonly string[]>
> = {
    strength: ['Сила', 'СИЛ'],
    dexterity: ['Спритність', 'СПР'],
    constitution: ['Статура', 'ТІЛ'],
    intelligence: ['Інтелект', 'ІНТ'],
    wisdom: ['Мудрість', 'МУД'],
    charisma: ['Харизма', 'ХАР'],
};

// short ability labels of the old unit CSV
export const LEGACY_ABILITY_SHORT: Readonly<Record<string, readonly string[]>> =
    { dexterity: ['ЛОВ'], wisdom: ['МДР'] };

export const TRUE_WORDS: ReadonlySet<string> = new Set([
    'так',
    'true',
    '1',
    '+',
    'yes',
    'y',
    'да',
    '✓',
    'x',
]);

export const FALSE_WORDS: ReadonlySet<string> = new Set([
    'ні',
    'false',
    '0',
    '-',
    'no',
    'n',
    'нет',
]);

export const BOOLEAN_WORDS: Record<Locale, { yes: string; no: string }> = {
    uk: { yes: 'так', no: 'ні' },
    en: { yes: 'yes', no: 'no' },
};

const EMPTY_PAIR: Pair = ['', ''];

export function exampleOf(locale: Locale, kind: ImportKind, key: string): Pair {
    return LOCALIZED[locale][kind][key] ?? NEUTRAL[kind][key] ?? EMPTY_PAIR;
}

export const LEGACY_DICE_LETTERS = 'кk';

export const LEGACY_NO_ATTACKS = 'Відсутні';

export const LEGACY_DAMAGE_KEYWORDS: readonly (readonly [
    string,
    readonly string[],
])[] = [
    ['piercing', ['колючий', 'piercing']],
    ['slashing', ['рублячий', 'slashing']],
    ['bludgeoning', ['дроблячий', 'bludgeoning']],
    ['fire', ["полум'я", 'fire', 'полумя']],
    ['cold', ['холод', 'cold']],
];

// legacy CSV unit columns (uk headers first, then en); the first non-empty value wins
export const LEGACY_UNIT_COLUMNS = {
    name: ['Назва', 'name', 'Name'],
    tier: ['Tier', 'tier'],
    group: ['Група', 'group', 'Group'],
    features: ['Особливості', 'features', 'Features'],
    strength: ['СИЛ', 'str', 'STR'],
    dexterity: ['ЛОВ', 'dex', 'DEX'],
    constitution: ['ТІЛ', 'con', 'CON'],
    intelligence: ['ІНТ', 'int', 'INT'],
    wisdom: ['МДР', 'wis', 'WIS'],
    charisma: ['ХАР', 'cha', 'CHA'],
    armorClass: ['КД', 'ac', 'AC'],
    speed: ['Швидкість', 'speed', 'Speed'],
    maxHp: ['ХП', 'hp', 'HP'],
    attacks: ['Атаки', 'attacks', 'Attacks'],
    abilities: ['Навички/Здібності', 'abilities', 'Abilities'],
} as const;
