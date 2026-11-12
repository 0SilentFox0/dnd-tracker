import type { Namespace } from './config';

import { metaOf, type SystemPageScope } from '@/lib/utils/rules/systems/meta';

export type SystemScopeSlot =
    | 'battle'
    | 'campaign'
    | 'member'
    | 'dm'
    | SystemPageScope;

const PLAIN_SLOTS = new Set<SystemScopeSlot>([
    'battle',
    'campaign',
    'member',
    'dm',
]);

export function systemScope(
    key: string | null,
    slot: SystemScopeSlot
): readonly Namespace[] {
    const i18n = key ? metaOf(key)?.i18n : undefined;

    if (!i18n) return [];

    const list = PLAIN_SLOTS.has(slot)
        ? i18n[slot as 'battle' | 'campaign' | 'member' | 'dm']
        : i18n.pages?.[slot as SystemPageScope];

    return (list ?? []) as readonly Namespace[];
}

/** Keys of `gameTerms.ruleSystem.*` follow the open set of system keys, so the typed translator cannot check them. */
export const ruleSystemLabelKey = (key: string): never =>
    `ruleSystem.${key}` as never;
