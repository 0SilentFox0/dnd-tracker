import type { Pack } from '../lib/pack';
import { ADAPTERS } from './adapters';
import { SYSTEM_MODULE, systemBases } from './modules';
import type { PackHooks, PackIssue } from './types';

import { PRESETS } from '@/lib/utils/rules/systems/catalog';
import { metaOf } from '@/lib/utils/rules/systems/meta';
// <systems:generated>
import { D20_MODULE_HOOKS } from '@/scripts/templates/systems/d20';
import { HOMM_MODULE_HOOKS } from '@/scripts/templates/systems/homm';
import { WFRP_MODULE_HOOKS } from '@/scripts/templates/systems/wfrp';
// </systems:generated>

export { SYSTEM_MODULE, systemBases };

export type {
    Glossary,
    PackHooks,
    PackIssue,
    PackRefs,
    PrepareCtx,
} from './types';

export const MODULE_HOOKS: Readonly<Record<string, PackHooks>> = {
    // <systems:generated>
    d20: D20_MODULE_HOOKS,
    homm: HOMM_MODULE_HOOKS,
    wfrp: WFRP_MODULE_HOOKS,
    // </systems:generated>
};

const hooksOf = (key: string): PackHooks => {
    const { base, modules } = PRESETS[key];

    const own = metaOf(key)?.module;

    const sources = [
        ...new Set([base, ...modules, ...(own ? [own] : [])]),
    ].flatMap((id) =>
        Object.hasOwn(MODULE_HOOKS, id) ? [MODULE_HOOKS[id]] : []
    );

    return sources.length === 1 ? sources[0] : Object.assign({}, ...sources);
};

export const PACK_HOOKS: Readonly<Record<string, PackHooks>> =
    Object.fromEntries(Object.keys(PRESETS).map((key) => [key, hooksOf(key)]));

export const PACK_ADAPTERS: Readonly<
    Record<string, { validate?(pack: Pack): PackIssue[] }>
> = ADAPTERS;
