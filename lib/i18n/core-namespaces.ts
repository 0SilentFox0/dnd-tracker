export const CAMPAIGN_NAMESPACES = [
    'common',
    'validation',
    'onboarding',
    'races',
    'skills',
    'classes',
    'feats',
    'backgrounds',
    'artifacts',
    'music',
    'soundboard',
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
    'scenario',
    'scenarioGraph',
    'show',
    'acquaintances',
    'world',
    'maps',
    'tileLabels',
    'compendium',
    'contentImport',
    'contentCopy',
    'gameTerms',
    'abilityText',
    'battleTerms',
] as const;

export const BATTLE_NAMESPACES = [
    'battleCommon',
    'battle',
    'battleWizards',
    'battleDm',
    'battleSetup',
    'battleLog',
    'battleActions',
] as const;

const SITE_NAMESPACES = [
    'errors',
    'auth',
    'landing',
    'demoTours',
    'whatsNew',
    'help',
    'ai',
    'assistant',
    'compendiumReport',
] as const;

type CoreNamespace =
    | (typeof SITE_NAMESPACES)[number]
    | (typeof CAMPAIGN_NAMESPACES)[number]
    | (typeof BATTLE_NAMESPACES)[number];

export const CORE_NAMESPACES: readonly CoreNamespace[] = [
    ...new Set<CoreNamespace>([
        ...SITE_NAMESPACES,
        ...CAMPAIGN_NAMESPACES,
        ...BATTLE_NAMESPACES,
    ]),
];
