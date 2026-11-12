import {
    type SystemNamespace,
    systemNamespaces,
} from '@/lib/utils/rules/systems/meta';

export const LOCALES = ['uk', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'uk';

export const LOCALE_COOKIE = 'NEXT_LOCALE';

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LOCALE_CHANGE_EVENT = 'locale-change';

export const APP_TIME_ZONE = 'UTC';

export const CORE_NAMESPACES = [
    'common',
    'validation',
    'errors',
    'auth',
    'landing',
    'onboarding',
    'demoTours',
    'whatsNew',
    'help',
    'races',
    'skills',
    'classes',
    'feats',
    'backgrounds',
    'artifacts',
    'music',
    'choices',
    'campaigns',
    'dashboard',
    'characters',
    'characterProfile',
    'inventory',
    'rest',
    'spells',
    'spellEditor',
    'editors',
    'units',
    'abilities',
    'abilityRegistry',
    'rules',
    'skillTree',
    'scenario',
    'scenarioGraph',
    'show',
    'acquaintances',
    'world',
    'ai',
    'compendium',
    'contentImport',
    'gameTerms',
    'assistant',
    'compendiumReport',
    'abilityText',
    'battleTerms',
    'battleCommon',
    'battle',
    'battleWizards',
    'battleDm',
    'battleSetup',
    'battleLog',
    'battleActions',
] as const;

export type Namespace = (typeof CORE_NAMESPACES)[number] | SystemNamespace;

export const NAMESPACES: readonly Namespace[] = [
    ...CORE_NAMESPACES,
    ...(systemNamespaces() as readonly SystemNamespace[]),
];

export const SERVER_NAMESPACES = [
    'errors',
    'assistant',
    'compendiumReport',
] as const satisfies readonly Namespace[];

export function isLocale(value: unknown): value is Locale {
    return (
        typeof value === 'string' &&
        (LOCALES as readonly string[]).includes(value)
    );
}
