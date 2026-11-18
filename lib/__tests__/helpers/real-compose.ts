import type { ComposeFn } from './composition-matrix';

import { SYSTEM_UI, systemUiOf } from '@/components/systems/registry';
import { systemServerOf } from '@/lib/server/systems/registry';
import { ruleSystemOf } from '@/lib/utils/rules/systems/lookup';

export const realCompose: ComposeFn = (key, modules) => {
    const system = { key, ...(modules ? { modules: [...modules] } : {}) };

    return {
        definition: ruleSystemOf({ system }),
        ui: modules ? systemUiOf(key, modules) : SYSTEM_UI[key],
        server: systemServerOf({ system }),
    };
};
