import { SECTION_DEFAULTS } from '../../defaults';
import { defaultRulesFor } from '../../section-registry';
import type { Ruleset } from '../../section-shapes';

const fullDefaults: Record<string, unknown> = {
    ...defaultRulesFor({ key: 'homm' }),
};

delete fullDefaults.advancement;

const { opportunityAttacks, retaliation, ...actions } = (
    fullDefaults.actions as Record<string, unknown>
);

void opportunityAttacks;
void retaliation;

/** Module toggles stay absent (read as `!== false`): the fixture equals the pre-module defaults, see default-rules.frozen.json */
export const DEFAULT_RULES = {
    ...SECTION_DEFAULTS,
    ...fullDefaults,
    actions,
    tables: {},
    system: { key: 'homm' },
} as Ruleset;
