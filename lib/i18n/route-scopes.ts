import type { Namespace } from './config';
import { BATTLE_NAMESPACES } from './core-namespaces';
import {
    logScope,
    rulesFormScope,
    systemPackScope,
    systemScope,
    type SystemScopeInput,
    type SystemScopeSlot,
} from './system-scope';

import type { PackKey } from '@/lib/utils/rules/systems/meta';

export type { PackKey };

export const CAMPAIGN_BASE = [
    'common',
    'validation',
    'gameTerms',
    'inventory',
    'onboarding',
    'soundboard',
    'abilities',
] as const satisfies readonly Namespace[];

/** uk gzip budget (KB) of the base alone; routes and system packs have their own */
export const CAMPAIGN_BASE_LIMIT_KB = 16.2;

export const PACKS = {
    campaigns: ['campaigns'],
    dashboard: ['dashboard', 'campaigns'],
    rules: ['rules'],
    characterSheet: [
        'characters',
        'characterProfile',
        'rest',
        'races',
        'classes',
        'feats',
        'backgrounds',
        'skills',
        'artifacts',
        'choices',
        'spells',
        'spellEditor',
        'scenario',
    ],
    abilityDisplay: [
        'abilityRegistry',
        'abilityText',
        'battleTerms',
        'battleCommon',
    ],
    abilityEditor: ['abilityEditor', 'spellEditor', 'editors'],
    contentLibrary: [
        'spells',
        'races',
        'classes',
        'feats',
        'backgrounds',
        'skills',
        'artifacts',
        'choices',
        'compendium',
        'contentImport',
        'contentCopy',
    ],
    story: [
        'scenario',
        'scenarioGraph',
        'show',
        'acquaintances',
        'world',
        'music',
        'maps',
        'tileLabels',
        'quests',
        'rest',
        'contentCopy',
    ],
    battle: [...BATTLE_NAMESPACES, 'maps', 'tileLabels', 'music'],
    ai: ['ai', 'scenario'],
    units: ['units'],
} as const satisfies Record<PackKey, readonly Namespace[]>;

const EDITOR = ['abilityDisplay', 'abilityEditor', 'characterSheet'] as const;

const CONTENT_LIST = ['contentLibrary', 'abilityDisplay'] as const;

const CONTENT_EDIT = [...CONTENT_LIST, 'abilityEditor', 'characterSheet'] as const;

const CONSERVATIVE = [
    'characterSheet',
    'abilityDisplay',
    'abilityEditor',
    'contentLibrary',
] as const;

const STORY = ['story'] as const;

const STORY_DASHBOARD = ['story', 'dashboard'] as const;

const SYSTEM_SECTION = [
    'characterSheet',
    'abilityDisplay',
    'abilityEditor',
] as const;

export const ROUTE_SCOPES = {
    list: ['campaigns'],
    new: ['campaigns'],
    '[id]': ['dashboard', 'rules'],
    '[id]/info': ['dashboard', 'rules', 'characterSheet', 'abilityDisplay'],
    '[id]/character': ['characterSheet', 'abilityDisplay', 'rules'],
    '[id]/character/draft': ['characterSheet', 'contentLibrary'],
    '[id]/character/new': ['characterSheet', 'contentLibrary'],
    '[id]/character/edit': ['characterSheet', 'contentLibrary'],
    '[id]/battles': [
        'battle',
        'abilityDisplay',
        'characterSheet',
        'rules',
    ],
    '[id]/journal': ['story'],
    '[id]/world': ['story'],
    '[id]/show': ['story'],
    '[id]/acquaintances': ['story'],
    '[id]/dm/spells': CONTENT_LIST,
    '[id]/dm/spells/[spellId]': EDITOR,
    '[id]/dm/spells/new': EDITOR,
    '[id]/dm/spell-groups': CONTENT_LIST,
    '[id]/dm/races': CONTENT_EDIT,
    '[id]/dm/races/[raceId]': EDITOR,
    '[id]/dm/classes': SYSTEM_SECTION,
    '[id]/dm/classes/[classId]': CONTENT_EDIT,
    '[id]/dm/feats': CONTENT_LIST,
    '[id]/dm/feats/[featId]': EDITOR,
    '[id]/dm/backgrounds': SYSTEM_SECTION,
    '[id]/dm/backgrounds/[backgroundId]': CONTENT_EDIT,
    '[id]/dm/artifacts': CONTENT_LIST,
    '[id]/dm/artifacts/[artifactId]': EDITOR,
    '[id]/dm/artifacts/new': EDITOR,
    '[id]/dm/skills': ['characterSheet', 'abilityDisplay'],
    '[id]/dm/skills/[skillId]': EDITOR,
    '[id]/dm/skills/new': EDITOR,
    '[id]/dm/main-skills': ['characterSheet', 'abilityDisplay'],
    '[id]/dm/main-skills/[mainSkillId]': EDITOR,
    '[id]/dm/compendium': CONTENT_LIST,
    '[id]/dm/characters': [
        'characterSheet',
        'abilityDisplay',
        'contentLibrary',
    ],
    '[id]/dm/characters/[characterId]': [
        'characterSheet',
        'abilityDisplay',
        'contentLibrary',
    ],
    '[id]/dm/units': ['units', ...CONTENT_LIST],
    '[id]/dm/units/new': ['units', ...EDITOR],
    '[id]/dm/units/[unitId]': ['units', ...EDITOR],
    '[id]/dm/battles': ['battle', 'abilityDisplay'],
    '[id]/dm/maps': ['story'],
    '[id]/dm/maps/[mapId]': ['story', 'battle', 'abilityDisplay'],
    '[id]/dm/scenario': [...STORY_DASHBOARD, 'ai'],
    '[id]/dm/graph': STORY_DASHBOARD,
    '[id]/dm/show': STORY,
    '[id]/dm/world': STORY,
    '[id]/dm/music': STORY,
    '[id]/dm/ai': ['ai'],
    '[id]/dm/assistant': ['ai'],
    '[id]/dm/rules': ['rules', 'abilityDisplay'],
    '[id]/dm/print': CONSERVATIVE,
    '[id]/dm/system': CONSERVATIVE,
} as const satisfies Record<string, readonly PackKey[]>;

export type RouteKey = keyof typeof ROUTE_SCOPES;

export const ROUTE_SYSTEM_PAGE: Partial<Record<RouteKey, SystemScopeSlot>> = {
    '[id]/character': 'character',
    '[id]/character/draft': 'draft',
    '[id]/character/new': 'draft',
    '[id]/dm/characters/[characterId]': 'dmCharacter',
    '[id]/dm/characters': 'dmCharacters',
    '[id]/dm/rules': 'dmRules',
};

export { systemPackScope };

export function routeNamespaces(
    route: RouteKey,
    system: SystemScopeInput | null
): readonly Namespace[] {
    const packs: readonly PackKey[] = ROUTE_SCOPES[route];

    const page = ROUTE_SYSTEM_PAGE[route];

    return [
        ...new Set<Namespace>([
            ...packs.flatMap((pack) => PACKS[pack] as readonly Namespace[]),
            ...packs.flatMap((pack) => systemPackScope(system, pack)),
            ...(packs.includes('battle') ? logScope(system) : []),
            ...(page ? systemScope(system, page) : []),
            ...(route === '[id]/dm/rules' ? rulesFormScope() : []),
        ]),
    ];
}

/** uk gzip budget (KB) per deepest RouteScope key: base + whatsNew + packs of the whole layout chain */
export const ROUTE_BUDGETS_KB: Partial<Record<RouteKey, number>> = {
    '[id]': 28.2,
    '[id]/acquaintances': 35.8,
    '[id]/battles': 87.4,
    '[id]/character': 59.7,
    '[id]/character/draft': 69.3,
    '[id]/character/edit': 69.3,
    '[id]/character/new': 69.3,
    '[id]/dm/ai': 26.5,
    '[id]/dm/artifacts': 52.8,
    '[id]/dm/artifacts/[artifactId]': 70.7,
    '[id]/dm/artifacts/new': 70.7,
    '[id]/dm/assistant': 26.5,
    '[id]/dm/backgrounds': 60.7,
    '[id]/dm/backgrounds/[backgroundId]': 70.6,
    '[id]/dm/battles': 59.3,
    '[id]/dm/characters': 65.5,
    '[id]/dm/characters/[characterId]': 65.5,
    '[id]/dm/classes': 60.7,
    '[id]/dm/classes/[classId]': 70.6,
    '[id]/dm/compendium': 52.8,
    '[id]/dm/feats': 52.8,
    '[id]/dm/feats/[featId]': 70.7,
    '[id]/dm/graph': 41.8,
    '[id]/dm/main-skills': 55.4,
    '[id]/dm/main-skills/[mainSkillId]': 60.7,
    '[id]/dm/maps': 35.8,
    '[id]/dm/maps/[mapId]': 71.5,
    '[id]/dm/music': 35.8,
    '[id]/dm/print': 70.6,
    '[id]/dm/races': 70.7,
    '[id]/dm/races/[raceId]': 70.7,
    '[id]/dm/rules': 36.1,
    '[id]/dm/scenario': 46.6,
    '[id]/dm/show': 35.8,
    '[id]/dm/skills': 55.4,
    '[id]/dm/skills/[skillId]': 60.7,
    '[id]/dm/skills/new': 60.7,
    '[id]/dm/spell-groups': 52.8,
    '[id]/dm/spells': 52.8,
    '[id]/dm/spells/[spellId]': 70.7,
    '[id]/dm/spells/new': 70.7,
    '[id]/dm/system': 70.6,
    '[id]/dm/units': 54.7,
    '[id]/dm/units/[unitId]': 72.7,
    '[id]/dm/units/new': 72.7,
    '[id]/dm/world': 35.8,
    '[id]/info': 65.2,
    '[id]/journal': 35.8,
    '[id]/show': 35.8,
    '[id]/world': 35.8,
    'list': 21.3,
    'new': 21.3,
};
