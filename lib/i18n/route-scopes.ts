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

export const PACKS = {
    campaigns: ['campaigns'],
    dashboard: ['dashboard'],
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
    ],
    abilityDisplay: ['abilityRegistry', 'abilityText', 'battleTerms'],
    abilityEditor: ['spellEditor', 'editors'],
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
    ],
    battle: BATTLE_NAMESPACES,
    ai: ['ai'],
    units: ['units'],
} as const satisfies Record<PackKey, readonly Namespace[]>;

const EDITOR = ['abilityDisplay', 'abilityEditor', 'characterSheet'] as const;

const CONTENT_LIST = ['contentLibrary'] as const;

const CONSERVATIVE = [
    'characterSheet',
    'abilityDisplay',
    'abilityEditor',
    'contentLibrary',
] as const;

const STORY = ['story', 'dashboard'] as const;

export const ROUTE_SCOPES = {
    list: ['campaigns'],
    new: ['campaigns'],
    '[id]': ['dashboard', 'rules'],
    '[id]/info': ['dashboard', 'rules', 'characterSheet', 'abilityDisplay'],
    '[id]/character': ['characterSheet', 'abilityDisplay', 'rules', 'story'],
    '[id]/character/draft': ['characterSheet', 'contentLibrary'],
    '[id]/character/new': ['characterSheet', 'contentLibrary'],
    '[id]/character/edit': ['characterSheet', 'contentLibrary'],
    '[id]/battles': [
        'battle',
        'abilityDisplay',
        'characterSheet',
        'rules',
        'story',
    ],
    '[id]/journal': ['story'],
    '[id]/world': ['story'],
    '[id]/show': ['story'],
    '[id]/acquaintances': ['story'],
    '[id]/dm': ['contentLibrary'],
    '[id]/dm/spells': CONTENT_LIST,
    '[id]/dm/spells/[spellId]': EDITOR,
    '[id]/dm/spells/new': EDITOR,
    '[id]/dm/spell-groups': CONTENT_LIST,
    '[id]/dm/races': CONTENT_LIST,
    '[id]/dm/races/[raceId]': EDITOR,
    '[id]/dm/classes': CONSERVATIVE,
    '[id]/dm/classes/[classId]': EDITOR,
    '[id]/dm/feats': CONTENT_LIST,
    '[id]/dm/feats/[featId]': EDITOR,
    '[id]/dm/backgrounds': CONSERVATIVE,
    '[id]/dm/backgrounds/[backgroundId]': EDITOR,
    '[id]/dm/artifacts': CONTENT_LIST,
    '[id]/dm/artifacts/[artifactId]': EDITOR,
    '[id]/dm/artifacts/new': EDITOR,
    '[id]/dm/skills': CONSERVATIVE,
    '[id]/dm/skills/[skillId]': EDITOR,
    '[id]/dm/skills/new': EDITOR,
    '[id]/dm/main-skills': CONSERVATIVE,
    '[id]/dm/main-skills/[mainSkillId]': EDITOR,
    '[id]/dm/compendium': CONTENT_LIST,
    '[id]/dm/npc-heroes': CONSERVATIVE,
    '[id]/dm/characters': [
        'characterSheet',
        'abilityDisplay',
        'contentLibrary',
    ],
    '[id]/dm/characters/new': [
        'characterSheet',
        'abilityDisplay',
        'contentLibrary',
    ],
    '[id]/dm/characters/[characterId]': [
        'characterSheet',
        'abilityDisplay',
        'contentLibrary',
    ],
    '[id]/dm/units': ['units', 'contentLibrary'],
    '[id]/dm/units/new': ['units', ...EDITOR],
    '[id]/dm/units/[unitId]': ['units', ...EDITOR],
    '[id]/dm/battles': ['battle', 'abilityDisplay'],
    '[id]/dm/battles/new': ['battle', 'abilityDisplay'],
    '[id]/dm/battles/[battleId]': ['battle', 'abilityDisplay'],
    '[id]/dm/maps': ['story'],
    '[id]/dm/maps/[mapId]': ['story', 'battle'],
    '[id]/dm/scenario': STORY,
    '[id]/dm/scenario/[pageId]': STORY,
    '[id]/dm/graph': STORY,
    '[id]/dm/show': STORY,
    '[id]/dm/show/[deckId]': STORY,
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
