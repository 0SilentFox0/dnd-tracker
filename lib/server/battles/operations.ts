import { API_ERRORS } from '@/lib/constants/api-errors';
import { BattleStatus } from '@/lib/constants/battle';
import {
    abilityActionSchema,
    attackBodySchema,
    auraZoneSchema,
    bonusActionSchema,
    castSpellSchema,
    mapBackgroundBodySchema,
    mapMotionSchema,
    mapTerrainSchema,
    mapWeatherSchema,
    mazeActionSchema,
    mazeMarkSchema,
    moveSchema,
    nextTurnSchema,
    patchParticipantSchema,
} from '@/lib/schemas/battles';
import { ContentError } from '@/lib/server/content/errors';
import {
    systemBattleOperation,
    systemBattleOperationOf,
} from '@/lib/server/systems/registry';
import type { BattleOperationDeps } from '@/lib/server/systems/types';
import {
    BattleAccess,
    type BattleMutationContext,
    type RunBattleMutationOptions,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { BattleAccessError, BattleRuleError } from '@/lib/utils/battle/store';

export type BattleOperationParams = {
    id: string;
    battleId: string;
    participantId?: string;
};
type Definition = Omit<RunBattleMutationOptions<unknown>, 'params'>;
type Loader = (params: BattleOperationParams) => Promise<Definition>;
type Loaded<T> = Pick<RunBattleMutationOptions<T>, 'schema' | 'mutate'>;
type Settings<T> = Omit<
    RunBattleMutationOptions<T>,
    'params' | 'schema' | 'mutate'
>;

function operation<T>({
    load,
    ...settings
}: Settings<T> & {
    load: (params: BattleOperationParams) => Promise<Loaded<T>>;
}): Loader {
    return async (params) =>
        ({
            requireStatus: BattleStatus.ACTIVE,
            ...settings,
            ...(await load(params)),
        }) as Definition;
}

export const mutateSystemOperation =
    (name: string, missing: string) =>
    async (ctx: BattleMutationContext, body: unknown) =>
        (await loadSystemOperation(name, missing)).mutate(ctx, body as never);

async function loadSystemOperation(
    name: string,
    missing: string
): Promise<Loaded<unknown>> {
    const known = systemBattleOperation(name);

    if (!known)
        throw new BattleAccessError(404, API_ERRORS.BATTLE_UNKNOWN_OPERATION);

    const deps: BattleOperationDeps = {
        attack: async (ctx, request, resume, replay) => {
            const { createAttackMutation } = await import(
                '@/lib/server/battles/mutations/attack/attack-mutation'
            );

            return createAttackMutation(undefined, replay)(
                ctx,
                request,
                resume
            );
        },
        spell: async (ctx, request, resume) => {
            const { createSpellMutation } = await import(
                '@/lib/server/battles/mutations/spell/spell-mutation'
            );

            return createSpellMutation()(ctx, request, resume);
        },
    };

    const { schema } = await known.load(deps);

    const mutate = async (ctx: BattleMutationContext, body: unknown) => {
        const op = systemBattleOperationOf(ctx.meta.rules, name);

        if (!op) throw new BattleRuleError('action_rejected', missing);

        const loaded = await op.load(deps);

        return loaded.mutate(ctx, loaded.schema.parse(body) as never);
    };

    return { schema, mutate };
}

const { DM, MEMBER, CURRENT_CONTROLLER } = BattleAccess;

const OPERATIONS: Record<string, Loader> = {
    'ability-action': operation({
        access: MEMBER,
        blockedByMode: true,
        rateLimitScope: 'abilityAction',
        respond: 'wrapped',
        load: async () => {
            const { abilityActionMutation } = await import(
                '@/lib/server/battles/mutations/ability-action/ability-action-mutation'
            );

            return {
                schema: abilityActionSchema,
                mutate: abilityActionMutation,
            };
        },
    }),
    'add-participant': operation({
        access: DM,
        allowWhileAwaitingDm: true,
        load: async () => {
            const { addParticipantSchema, createAddParticipantMutation } =
                await import(
                    '@/lib/server/battles/mutations/add-participant/add-participant-mutation'
                );

            return {
                schema: addParticipantSchema,
                mutate: createAddParticipantMutation(),
            };
        },
    }),
    attack: operation({
        access: MEMBER,
        blockedByMode: true,
        rateLimitScope: 'attack',
        load: async () => {
            const { attackMutation } = await import(
                '@/lib/server/battles/mutations/attack/attack-mutation'
            );

            return { schema: attackBodySchema, mutate: attackMutation };
        },
    }),
    'aura-zone': operation({
        access: MEMBER,
        blockedByMode: true,
        rateLimitScope: 'abilityAction',
        respond: 'wrapped',
        load: async () => {
            const { auraZoneMutation } = await import(
                '@/lib/server/battles/mutations/aura-zone/aura-zone-mutation'
            );

            return { schema: auraZoneSchema, mutate: auraZoneMutation };
        },
    }),
    'bonus-action': operation({
        access: MEMBER,
        blockedByMode: true,
        rateLimitScope: 'bonusAction',
        respond: 'wrapped',
        load: async () => {
            const { bonusActionMutation } = await import(
                '@/lib/server/battles/mutations/bonus-action/bonus-action-mutation'
            );

            return { schema: bonusActionSchema, mutate: bonusActionMutation };
        },
    }),
    'crit-choice': operation({
        access: DM,
        allowWhileAwaitingDm: true,
        allowWhileCritPending: true,
        respond: 'wrapped',
        load: () =>
            loadSystemOperation('crit-choice', API_ERRORS.CRIT_CHOICE_NONE),
    }),
    complete: operation({
        access: DM,
        allowWhileAwaitingDm: true,
        allowWhileCritPending: true,
        load: async () => {
            const { completeBattleSchema, completeMutation } = await import(
                '@/lib/server/battles/mutations/complete/complete-mutation'
            );

            return { schema: completeBattleSchema, mutate: completeMutation };
        },
    }),
    conditions: operation({
        access: DM,
        load: async () => {
            const { battleConditionsMutation, battleConditionsSchema } =
                await import(
                    '@/lib/server/battles/mutations/conditions/conditions-mutation'
                );

            return {
                schema: battleConditionsSchema,
                mutate: battleConditionsMutation,
            };
        },
    }),
    'condition-test': operation({
        access: MEMBER,
        blockedByMode: true,
        rateLimitScope: 'attack',
        load: async () => {
            const { conditionTestMutation, conditionTestSchema } = await import(
                '@/lib/server/battles/mutations/condition-test/condition-test-mutation'
            );

            return {
                schema: conditionTestSchema,
                mutate: conditionTestMutation,
            };
        },
    }),
    channel: operation({
        access: MEMBER,
        blockedByMode: true,
        rateLimitScope: 'attack',
        load: () =>
            loadSystemOperation(
                'channel',
                API_ERRORS.BATTLE_CHANNEL_UNSUPPORTED
            ),
    }),
    'system-condition': operation({
        access: DM,
        load: async () => {
            const { systemConditionMutation, systemConditionSchema } =
                await import(
                    '@/lib/server/battles/mutations/system-condition/system-condition-mutation'
                );

            return {
                schema: systemConditionSchema,
                mutate: systemConditionMutation,
            };
        },
    }),
    'initiative-reorder': operation({
        access: DM,
        load: async () => {
            const { initiativeReorderMutation, initiativeReorderSchema } =
                await import(
                    '@/lib/server/battles/mutations/initiative/initiative-reorder-mutation'
                );

            return {
                schema: initiativeReorderSchema,
                mutate: initiativeReorderMutation,
            };
        },
    }),
    'initiative-roll': operation({
        access: DM,
        load: async () => {
            const { initiativeRollMutation, initiativeRollSchema } =
                await import(
                    '@/lib/server/battles/mutations/initiative/initiative-roll-mutation'
                );

            return {
                schema: initiativeRollSchema,
                mutate: initiativeRollMutation,
            };
        },
    }),
    'core-action': operation({
        access: MEMBER,
        blockedByMode: true,
        load: async () => {
            const { coreActionMutation } = await import(
                '@/lib/server/battles/mutations/core-action/core-action-mutation'
            );

            const { legendaryMutation } = await import(
                '@/lib/server/battles/mutations/core-action/legendary-mutation'
            );

            const { coreActionRouteSchema } = await import(
                '@/lib/utils/battle/actions/schema'
            );

            return {
                schema: coreActionRouteSchema,
                mutate: (ctx, body) =>
                    body.action === 'legendary'
                        ? legendaryMutation(ctx, body)
                        : coreActionMutation(ctx, body),
            };
        },
    }),
    'map-terrain': operation({
        access: DM,
        rateLimitScope: 'mapTerrain',
        load: async () => {
            const { mapTerrainMutation } = await import(
                '@/lib/server/battles/mutations/map-terrain/map-terrain-mutation'
            );

            return { schema: mapTerrainSchema, mutate: mapTerrainMutation };
        },
    }),
    'map-background': operation({
        access: DM,
        rateLimitScope: 'mapBackground',
        load: async ({ id }) => {
            const { createMapBackgroundMutation } = await import(
                '@/lib/server/battles/mutations/map-background/map-background-mutation'
            );

            return {
                schema: mapBackgroundBodySchema,
                mutate: createMapBackgroundMutation(id),
            };
        },
    }),
    'map-motion': operation({
        access: DM,
        rateLimitScope: 'mapMotion',
        load: async () => {
            const { mapMotionMutation } = await import(
                '@/lib/server/battles/mutations/map-motion/map-motion-mutation'
            );

            return { schema: mapMotionSchema, mutate: mapMotionMutation };
        },
    }),
    'map-weather': operation({
        access: DM,
        rateLimitScope: 'mapWeather',
        load: async () => {
            const { mapWeatherMutation } = await import(
                '@/lib/server/battles/mutations/map-weather/map-weather-mutation'
            );

            return { schema: mapWeatherSchema, mutate: mapWeatherMutation };
        },
    }),
    maze: operation({
        access: DM,
        rateLimitScope: 'maze',
        load: async () => {
            const { mazeMutation } = await import(
                '@/lib/server/battles/mutations/maze/maze-mutation'
            );

            return { schema: mazeActionSchema, mutate: mazeMutation };
        },
    }),
    'maze-mark': operation({
        access: MEMBER,
        blockedByMode: true,
        rateLimitScope: 'mazeMark',
        load: async () => {
            const { mazeMarkMutation } = await import(
                '@/lib/server/battles/mutations/maze-mark/maze-mark-mutation'
            );

            return { schema: mazeMarkSchema, mutate: mazeMarkMutation };
        },
    }),
    'morale-check': operation({
        access: MEMBER,
        blockedByMode: true,
        allowWhileAwaitingDm: true,
        respond: 'wrapped',
        load: () =>
            loadSystemOperation(
                'morale-check',
                API_ERRORS.BATTLE_MORALE_DISABLED
            ),
    }),
    move: operation({
        access: MEMBER,
        rateLimitScope: 'move',
        respond: 'wrapped',
        load: async () => {
            const { moveMutation } = await import(
                '@/lib/server/battles/mutations/move/move-mutation'
            );

            return { schema: moveSchema, mutate: moveMutation };
        },
    }),
    'next-turn': operation({
        access: CURRENT_CONTROLLER,
        rateLimitScope: 'nextTurn',
        load: async () => {
            const { nextTurnMutation } = await import(
                '@/lib/server/battles/mutations/next-turn/next-turn-mutation'
            );

            return { schema: nextTurnSchema, mutate: nextTurnMutation };
        },
    }),
    'refresh-sources': operation({
        access: DM,
        allowWhileAwaitingDm: true,
        load: async () => {
            const { createRefreshSourcesMutation, refreshSourcesSchema } =
                await import(
                    '@/lib/server/battles/mutations/refresh-sources/refresh-sources-mutation'
                );

            return {
                schema: refreshSourcesSchema,
                mutate: createRefreshSourcesMutation(),
            };
        },
    }),
    reset: operation({
        access: DM,
        requireStatus: undefined,
        allowWhileAwaitingDm: true,
        allowWhileCritPending: true,
        load: async () => {
            const { resetMutation } = await import(
                '@/lib/server/battles/mutations/reset/reset-mutation'
            );

            return { mutate: resetMutation };
        },
    }),
    'reveal-participant': operation({
        access: DM,
        allowWhileAwaitingDm: true,
        load: async () => {
            const { revealParticipantMutation, revealParticipantSchema } =
                await import(
                    '@/lib/server/battles/mutations/reveal-participant/reveal-participant-mutation'
                );

            return {
                schema: revealParticipantSchema,
                mutate: revealParticipantMutation,
            };
        },
    }),
    rollback: operation({
        access: DM,
        requireStatus: undefined,
        allowWhileAwaitingDm: true,
        allowWhileCritPending: true,
        load: async () => {
            const { createRollbackMutation, rollbackSchema } = await import(
                '@/lib/server/battles/mutations/rollback/rollback-mutation'
            );

            return { schema: rollbackSchema, mutate: createRollbackMutation() };
        },
    }),
    'scale-units': operation({
        access: DM,
        rateLimitScope: 'participantPatch',
        load: async () => {
            const { scaleUnitsMutation, scaleUnitsSchema } = await import(
                '@/lib/server/battles/mutations/scale-units/scale-units-mutation'
            );

            return { schema: scaleUnitsSchema, mutate: scaleUnitsMutation };
        },
    }),
    spell: operation({
        access: MEMBER,
        blockedByMode: true,
        rateLimitScope: 'spell',
        dryRun: (body) => body.preview === true,
        load: async () => {
            const { createSpellMutation } = await import(
                '@/lib/server/battles/mutations/spell/spell-mutation'
            );

            return { schema: castSpellSchema, mutate: createSpellMutation() };
        },
    }),
    start: operation({
        access: DM,
        requireStatus: BattleStatus.PREPARED,
        load: async () => {
            const { createStartMutation } = await import(
                '@/lib/server/battles/mutations/start/start-mutation'
            );

            return { mutate: createStartMutation() };
        },
    }),
    'unit-control': operation({
        access: DM,
        rateLimitScope: 'participantPatch',
        load: async () => {
            const { unitControlMutation, unitControlSchema } = await import(
                '@/lib/server/battles/mutations/unit-control/unit-control-mutation'
            );

            return { schema: unitControlSchema, mutate: unitControlMutation };
        },
    }),
    'participants.patch': operation({
        access: DM,
        allowWhileAwaitingDm: true,
        rateLimitScope: 'participantPatch',
        load: async ({ participantId }: BattleOperationParams) => {
            const { patchParticipantMutation } = await import(
                '@/lib/server/battles/mutations/participants/patch-participant-mutation'
            );

            if (!participantId)
                throw new ContentError(
                    API_ERRORS.BATTLE_PARTICIPANT_ID_REQUIRED,
                    400
                );

            return {
                schema: patchParticipantSchema,
                mutate: (ctx, body) =>
                    patchParticipantMutation(ctx, participantId, body),
            };
        },
    }),
};

/** The HTTP and actor entry points consume these same schemas, guards and mutations. */
export async function getBattleOperation(
    name: string,
    params: BattleOperationParams
): Promise<Definition> {
    const load = Object.hasOwn(OPERATIONS, name) ? OPERATIONS[name] : undefined;

    if (!load)
        throw new BattleAccessError(404, API_ERRORS.BATTLE_UNKNOWN_OPERATION);

    return load(params);
}
