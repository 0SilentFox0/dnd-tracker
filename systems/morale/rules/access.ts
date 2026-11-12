import type { MoraleRules } from '@/lib/utils/rules/legacy-sections';
import type { Ruleset } from '@/lib/utils/rules/section-shapes';

export const moraleRules = ({ morale }: Ruleset): MoraleRules => ({ morale });
