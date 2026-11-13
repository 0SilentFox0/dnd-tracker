import type { Namespace } from './config';

import { composition, moduleMetaOf } from '@/lib/utils/rules/systems/catalog';
import {
    metaOf,
    type SystemMeta,
    type SystemPageScope,
} from '@/lib/utils/rules/systems/meta';

export type SystemScopeSlot =
    | 'battle'
    | 'campaign'
    | 'member'
    | 'dm'
    | SystemPageScope;

export interface SystemScopeInput {
    key: string | null;
    modules?: readonly string[];
}

const PLAIN_SLOTS = new Set<SystemScopeSlot>([
    'battle',
    'campaign',
    'member',
    'dm',
]);

const slotOf = (
    meta: SystemMeta | undefined,
    slot: SystemScopeSlot
): readonly Namespace[] => {
    const i18n = meta?.i18n;

    if (!i18n) return [];

    const list = PLAIN_SLOTS.has(slot)
        ? i18n[slot as 'battle' | 'campaign' | 'member' | 'dm']
        : i18n.pages?.[slot as SystemPageScope];

    return (list ?? []) as readonly Namespace[];
};

const metasOfComposition = (system: {
    key: string;
    modules?: readonly string[];
}): (SystemMeta | undefined)[] => {
    try {
        const { base, modules } = composition(system);

        return [
            metaOf(system.key),
            moduleMetaOf(base),
            ...modules.map((id) => moduleMetaOf(id)),
        ];
    } catch {
        return [];
    }
};

export function systemScope(
    system: string | SystemScopeInput | null,
    slot: SystemScopeSlot
): readonly Namespace[] {
    if (!system) return [];

    if (typeof system === 'string') return slotOf(metaOf(system), slot);

    if (!system.key) return [];

    const metas = metasOfComposition({
        key: system.key,
        modules: system.modules,
    });

    return [...new Set(metas.flatMap((meta) => slotOf(meta, slot)))];
}

/** Keys of `gameTerms.ruleSystem.*` follow the open set of system keys, so the typed translator cannot check them. */
export const ruleSystemLabelKey = (key: string): never =>
    `ruleSystem.${key}` as never;
