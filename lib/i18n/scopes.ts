import type { Namespace } from './config';
export { BATTLE_NAMESPACES, CAMPAIGN_NAMESPACES } from './core-namespaces';

export const ROOT_NAMESPACES = [
    'common',
    'validation',
    'whatsNew',
    'gameTerms',
] as const satisfies readonly Namespace[];
