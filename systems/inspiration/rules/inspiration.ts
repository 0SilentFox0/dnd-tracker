import type { InspirationRules } from '@/lib/utils/rules/systems/types';
import { d20State, withD20State } from '@/systems/d20/rules/state';

export const INSPIRATION_RULES: InspirationRules = {
    available: (p) => !!d20State(p).inspiration,
    spend: (p) =>
        withD20State(p, { inspiration: undefined, inspirationSpent: true }),
};
