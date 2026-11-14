import type { Ruleset } from '@/lib/utils/rules/schema';
import { isInstalled, ruleSystemOf } from '@/lib/utils/rules/systems';

/** Whether the campaign rules play with classes; a system without the hook has none, and neither does one not installed yet (root layout, landing) */
export const classesEnabled = (rules: Ruleset | null | undefined): boolean =>
    !!rules &&
    isInstalled(rules.system) &&
    (ruleSystemOf(rules).progression.classes?.(rules) ?? false);
