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
export const CAMPAIGN_BASE_LIMIT_KB = 17.8;

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
    contentTransfer: ['compendium', 'contentImport', 'contentCopy'],
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
    mapStamps: ['mapStamps'],
    battle: [...BATTLE_NAMESPACES, 'maps', 'tileLabels', 'music'],
    ai: ['ai'],
    units: ['units'],
    reference: ['reference'],
    scenarioTexts: ['scenario'],
} as const satisfies Record<PackKey, readonly Namespace[]>;

const EDITOR = ['abilityDisplay', 'abilityEditor', 'characterSheet'] as const;

const PREVIEW = [...EDITOR, 'reference'] as const;

const CONTENT_LIST = ['contentLibrary', 'abilityDisplay'] as const;

const CONTENT_EDIT = [
    ...CONTENT_LIST,
    'abilityEditor',
    'characterSheet',
] as const;

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
    'contentTransfer',
] as const;

const MAIN_SKILLS = [
    'characterSheet',
    'abilityDisplay',
    'contentTransfer',
] as const;

const SYSTEM_EDIT = [...EDITOR, 'contentTransfer'] as const;

export const ROUTE_SCOPES = {
    list: ['campaigns'],
    new: ['campaigns'],
    '[id]': ['dashboard', 'rules'],
    '[id]/info': [
        'dashboard',
        'rules',
        'characterSheet',
        'abilityDisplay',
        'reference',
    ],
    '[id]/character': ['characterSheet', 'abilityDisplay', 'rules'],
    '[id]/character/draft': ['characterSheet', 'contentLibrary'],
    '[id]/character/new': ['characterSheet', 'contentLibrary'],
    '[id]/character/edit': ['characterSheet', 'contentLibrary'],
    '[id]/battles': ['battle', 'abilityDisplay', 'characterSheet', 'rules'],
    '[id]/journal': ['story'],
    '[id]/world': ['story'],
    '[id]/show': ['story'],
    '[id]/acquaintances': ['story'],
    '[id]/dm/spells': CONTENT_LIST,
    '[id]/dm/spells/[spellId]': PREVIEW,
    '[id]/dm/spells/new': PREVIEW,
    '[id]/dm/spell-groups': CONTENT_LIST,
    '[id]/dm/races': CONTENT_EDIT,
    '[id]/dm/races/[raceId]': EDITOR,
    '[id]/dm/classes': [...SYSTEM_SECTION, 'reference'],
    '[id]/dm/classes/[classId]': [...CONTENT_EDIT, 'reference'],
    '[id]/dm/feats': CONTENT_LIST,
    '[id]/dm/feats/[featId]': EDITOR,
    '[id]/dm/backgrounds': SYSTEM_SECTION,
    '[id]/dm/backgrounds/[backgroundId]': CONTENT_EDIT,
    '[id]/dm/artifacts': CONTENT_LIST,
    '[id]/dm/artifacts/[artifactId]': PREVIEW,
    '[id]/dm/artifacts/new': PREVIEW,
    '[id]/dm/skills': SYSTEM_SECTION,
    '[id]/dm/skills/[skillId]': SYSTEM_EDIT,
    '[id]/dm/skills/new': SYSTEM_EDIT,
    '[id]/dm/main-skills': MAIN_SKILLS,
    '[id]/dm/main-skills/[mainSkillId]': SYSTEM_EDIT,
    '[id]/dm/compendium': CONTENT_LIST,
    '[id]/dm/characters': [
        'characterSheet',
        'abilityDisplay',
        'contentLibrary',
    ],
    '[id]/dm/characters/new': [],
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
    '[id]/dm/maps/[mapId]': ['story', 'battle', 'abilityDisplay', 'mapStamps'],
    '[id]/dm/scenario': [...STORY_DASHBOARD, 'ai'],
    '[id]/dm/graph': STORY_DASHBOARD,
    '[id]/dm/show': STORY,
    '[id]/dm/world': STORY,
    '[id]/dm/music': STORY,
    '[id]/dm/ai': ['ai'],
    '[id]/dm/assistant': ['ai'],
    '[id]/dm/rules': ['rules', 'abilityDisplay'],
    '[id]/dm/print': CONSERVATIVE,
    '[id]/dm/system': [...CONSERVATIVE, 'reference'],
} as const satisfies Record<string, readonly PackKey[]>;

export type RouteKey = keyof typeof ROUTE_SCOPES;

const ROUTE_SYSTEM_PAGE: Partial<Record<RouteKey, SystemScopeSlot>> = {
    '[id]/character': 'character',
    '[id]/character/draft': 'draft',
    '[id]/character/new': 'draft',
    '[id]/dm/characters/new': 'draft',
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
