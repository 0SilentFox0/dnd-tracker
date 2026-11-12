import { API_ERRORS } from '@/lib/constants/api-errors';
import type { SystemServer } from '@/lib/server/systems/types';
import {
    hitModelHeroStats,
    hitModelUnitStats,
} from '@/lib/utils/battle/balance';
import {
    CharacteristicsSchema,
    UnitCharacteristicsSchema,
} from '@/systems/wfrp/rules/characteristics/schema';
import { wfrpHitModel } from '@/systems/wfrp/rules/combat/hit-model';
import { WfrpItemStatsSchema } from '@/systems/wfrp/rules/equipment/stats';
import { WFRP_AI } from '@/systems/wfrp/server/ai';
import { WfrpFortuneInputSchema } from '@/systems/wfrp/server/attack-input';
import { WFRP_OPERATIONS } from '@/systems/wfrp/server/operations';

export const WFRP_MODULE_SERVER: SystemServer = {
    schemas: {
        characteristics: CharacteristicsSchema,
        unitCharacteristics: UnitCharacteristicsSchema,
        systemStats: WfrpItemStatsSchema,
        attackInput: WfrpFortuneInputSchema,
        castInput: WfrpFortuneInputSchema,
    },
    balance: {
        heroPower: ({ built }) => ({
            levels: {},
            stats: hitModelHeroStats(built, wfrpHitModel),
        }),
        unitStats: (base, built) =>
            hitModelUnitStats(base, built, wfrpHitModel),
        readsBuiltRules: true,
    },
    operations: WFRP_OPERATIONS,
    routes: {
        character: {
            advance: {
                POST: { operation: 'advance' },
                DELETE: { operation: 'advance.undo' },
            },
            career: { POST: { operation: 'career.set' } },
            'career.advance': { POST: { operation: 'career.advance' } },
            corruption: { POST: { operation: 'corruption.grant' } },
            'corruption.undo': { POST: { operation: 'corruption.undo' } },
            downtime: { PUT: { operation: 'downtime.set' } },
        },
        campaign: {
            'downtime.period': { POST: { operation: 'downtime.period' } },
            'downtime.period-undo': {
                POST: { operation: 'downtime.period.undo' },
            },
        },
    },
    battle: {
        channel: {
            settings: {
                access: 'member',
                blockedByMode: true,
                rateLimitScope: 'attack',
                missing: API_ERRORS.BATTLE_CHANNEL_UNSUPPORTED,
            },
            load: async () => {
                const { channelMutation, channelSchema } = await import(
                    './battle/channel-mutation'
                );

                return { schema: channelSchema, mutate: channelMutation };
            },
        },
    },
    ai: WFRP_AI,
};
