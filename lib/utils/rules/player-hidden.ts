import type { Ruleset } from './schema';
import { ALL_SECTIONS } from './section-registry';
import { parseSection } from './sections';

const HIDDEN = Object.entries(ALL_SECTIONS)
    .filter(([, section]) => section.playerHidden)
    .map(([name]) => name);

export const stripPlayerHiddenRules = (rules: Ruleset): Ruleset => ({
    ...rules,
    ...Object.fromEntries(
        HIDDEN.map((name) => [
            name,
            parseSection(ALL_SECTIONS[name], undefined),
        ])
    ),
});
