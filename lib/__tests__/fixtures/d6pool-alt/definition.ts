import type { D6TurnSystem } from '../d6pool-plus/definition';

import type { AddonBuilder } from '@/lib/utils/rules/systems/compose';

export const D6POOL_ALT_MODULE: AddonBuilder<D6TurnSystem> = (prev) => ({
    turn: { order: (ids) => [...prev.turn.order(ids)].reverse() },
});
