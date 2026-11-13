import { d20State, withD20State } from './state';

import type { InspirationRules } from '@/lib/utils/rules/systems/types';

export const D20_INSPIRATION: InspirationRules = {
    available: (p) => !!d20State(p).inspiration,
    spend: (p) =>
        withD20State(p, { inspiration: undefined, inspirationSpent: true }),
};
