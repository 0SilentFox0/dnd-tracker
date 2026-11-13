import type { Ruleset } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';

/** Whether the campaign rules play with classes; a system without the hook has none */
export const classesEnabled = (rules: Ruleset | null | undefined): boolean =>
    !!rules && (ruleSystemOf(rules).progression.classes?.(rules) ?? false);
