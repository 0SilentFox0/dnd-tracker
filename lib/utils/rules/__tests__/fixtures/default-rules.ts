import { SECTION_DEFAULTS } from '../../defaults';
import { defaultRulesFor } from '../../section-registry';
import type { Ruleset } from '../../section-shapes';

const fullDefaults: Record<string, unknown> = {
    ...defaultRulesFor({ key: 'homm' }),
};

delete fullDefaults.advancement;

/** `advancement` is owned by a system section and absent here; sections of modules come from the registry */
export const DEFAULT_RULES = {
    ...SECTION_DEFAULTS,
    ...fullDefaults,
    tables: {},
    system: { key: 'homm' },
} as Ruleset;
