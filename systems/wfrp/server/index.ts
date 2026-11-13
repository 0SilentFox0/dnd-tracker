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
import { careerToImportRecord } from '@/systems/wfrp/server/careers/import-record';
import { careerTierSchema } from '@/systems/wfrp/server/careers/schema';
import { careersResource } from '@/systems/wfrp/server/content/careers';
import { WFRP_CONTENT_REFS } from '@/systems/wfrp/server/content/refs';
import { WFRP_OPERATIONS } from '@/systems/wfrp/server/operations';
import {
    raceProfileSaveHandler,
    raceProfilesHandler,
} from '@/systems/wfrp/server/race-profile-routes';

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
    },
    contentKinds: {
        careers: {
            resource: careersResource,
            toImportRecord: careerToImportRecord,
            sharedSchemas: [[careerTierSchema, 'CareerTier']],
        },
    },
    contentRefs: WFRP_CONTENT_REFS,
    drafts: {
        create: async (request, campaign, access) =>
            (await import('./draft/create-wfrp-draft')).createWfrpDraft(
                request,
                campaign,
                access
            ),
        update: async (request, campaignId, characterId, access) =>
            (await import('./draft/patch-wfrp-draft')).patchWfrpDraft(
                request,
                campaignId,
                characterId,
                access
            ),
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
            'race-profiles': { GET: raceProfilesHandler },
            'race-profile': { PUT: raceProfileSaveHandler },
        },
    },
    battle: {
        'condition-test': {
            settings: {
                access: 'member',
                blockedByMode: true,
                rateLimitScope: 'attack',
                missing: API_ERRORS.CONDITION_UNSUPPORTED,
            },
            load: async () => {
                const { conditionTestMutation, conditionTestSchema } =
                    await import('./battle/condition-test-mutation');

                return {
                    schema: conditionTestSchema,
                    mutate: conditionTestMutation,
                };
            },
        },
        'system-condition': {
            settings: {
                access: 'dm',
                missing: API_ERRORS.CONDITION_UNSUPPORTED,
            },
            load: async () => {
                const { systemConditionMutation, systemConditionSchema } =
                    await import('./battle/system-condition-mutation');

                return {
                    schema: systemConditionSchema,
                    mutate: systemConditionMutation,
                };
            },
        },
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
