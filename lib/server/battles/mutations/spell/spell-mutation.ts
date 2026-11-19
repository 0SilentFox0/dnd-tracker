import {
    getCachedInterruptSpells,
    getCachedSummonPool,
} from '@/lib/cache/reference-data';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import type { SpellRequestData } from '@/lib/schemas/battles';
import {
    counteredResult,
    openCounterIfAny,
} from '@/lib/server/battles/mutations/spell/cast-counter';
import { executeCast } from '@/lib/server/battles/mutations/spell/cast-execute';
import { resolvePicks } from '@/lib/server/battles/mutations/spell/cast-pick';
import {
    assertCasterMayCast,
    assertSpellRequestAllowed,
    beginLongCast,
    cancelCast,
    chooseSlot,
    loadCastableSpell,
} from '@/lib/server/battles/mutations/spell/cast-preflight';
import {
    prepareCastDice,
    resolveCastTargets,
} from '@/lib/server/battles/mutations/spell/cast-targets';
import type {
    CastPlan,
    SpellMutationDeps,
} from '@/lib/server/battles/mutations/spell/cast-types';
import { requireActor } from '@/lib/utils/battle/common/control';
import { assertMayCast } from '@/lib/utils/battle/common/spell-block';
import { runWithCritChoice } from '@/lib/utils/battle/crit-choice/run-with-crit-choice';
import type { CritResume } from '@/lib/utils/battle/crit-choice/types';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { ingredientsGate } from '@/lib/utils/battle/spell/ingredients';
import { resolveSpellSource } from '@/lib/utils/battle/spell/resolve-source';
import { splitSaveRolls } from '@/lib/utils/battle/spell/save-rolls';
import { BattleRuleError } from '@/lib/utils/battle/store';
import { REJECT } from '@/lib/utils/battle/store/reject';
import type { Rng } from '@/lib/utils/common/rng';
import { ruleSystemOf } from '@/lib/utils/rules/systems';

const defaultDeps: SpellMutationDeps = {
    loadSpell: (id, campaignId) =>
        prisma.spell.findFirst({ where: { id, campaignId } }),
    loadInterruptSpells: async (campaignId, ids) =>
        (await getCachedInterruptSpells(campaignId)).filter((s) =>
            ids.includes(s.id)
        ),
    loadPool: getCachedSummonPool,
};

export function createSpellMutation(
    deps: SpellMutationDeps = defaultDeps,
    options: {
        serverRolls?: boolean;
        critPause?: boolean;
        skipCounter?: boolean;
        rng?: Rng;
    } = {}
) {
    return async (
        ctx: BattleMutationContext,
        data: SpellRequestData,
        resume?: CritResume,
        replay?: { serverRolls?: boolean; seed?: number; counteredBy?: string }
    ): Promise<MutationResult> => {
        let order = ctx.participants;

        const spell = await loadCastableSpell(deps, ctx, data, order);

        const { definition } = spell;

        assertSpellRequestAllowed(ctx, data, definition);

        let caster = requireActor(ctx, data.casterId, {
            anyTurn: definition.cost === 'reaction',
            missing: REJECT.casterMissing,
            forbidden: REJECT.spellForbidden,
            inactive: {
                code: 'participant_dead',
                message: REJECT.casterInactive,
            },
        });

        if (data.cancelCasting) return cancelCast(ctx, order, caster);

        assertMayCast(caster, order);

        const source = resolveSpellSource(ctx, caster, spell, data);

        const { free, grant } = source;

        const system = await assertCasterMayCast(
            ctx,
            data,
            caster,
            spell,
            source,
            !!options.serverRolls
        );

        const chosen = chooseSlot(ctx, data, caster, spell, source);

        const castLevel =
            (grant ? data.castLevel : undefined) ??
            grant?.castLevel ??
            (chosen?.ok ? chosen.castLevel : undefined);

        const ingredients = ingredientsGate(
            caster,
            spell,
            ctx.meta.rules,
            source,
            {
                optional:
                    ruleSystemOf(ctx.meta.rules).magic.tested?.ingredients ===
                    'avertMiscast',
                use: !!data.useIngredient,
            }
        );

        if (definition.cost === 'long' && !free && !data.preview) {
            const long = beginLongCast(ctx, order, caster, spell, data, {
                grantKey: grant?.key,
                castLevel,
                hasGrant: !!grant,
            });

            if ('result' in long) return long.result;

            caster = long.caster;
            order = long.order;
        } else if (data.castingRounds !== undefined)
            throw new BattleRuleError(
                'action_rejected',
                API_ERRORS.BATTLE_TIME_ONLY_DURATION_CAST
            );

        const resolution = resolveCastTargets(
            ctx,
            data,
            order,
            caster,
            spell,
            source,
            castLevel
        );

        const picks = await resolvePicks(
            ctx,
            deps,
            data,
            definition,
            resolution
        );

        const { expected, diceRolls } = prepareCastDice(
            ctx,
            data,
            caster,
            spell,
            castLevel,
            !!options.serverRolls,
            resolution.targetIds.length
        );

        const plan: CastPlan = {
            ctx,
            data,
            deps,
            spell,
            caster,
            order,
            source,
            chosen,
            ingredients,
            castLevel,
            resolution,
            expected,
            diceRolls,
            saves: splitSaveRolls(ctx, order, data.saveRolls),
            serverRolls: !!options.serverRolls,
            system,
            ...picks,
        };

        if (replay?.counteredBy !== undefined)
            return counteredResult(plan, replay.counteredBy);

        if (
            !data.preview &&
            !resume &&
            replay?.seed === undefined &&
            !options.skipCounter
        ) {
            const paused = await openCounterIfAny({
                innate: !!grant?.inline,
                ctx,
                deps,
                data,
                spell,
                caster,
                order,
                diceRolls,
                serverRolls: !!options.serverRolls,
            });

            if (paused) return paused;
        }

        return runWithCritChoice(
            options.rng ? { ...ctx, rng: options.rng } : ctx,
            {
                action: 'spell',
                actorId: data.casterId,
                request: { ...data, diceRolls },
                enabled:
                    ctx.meta.critChoiceByDm &&
                    !data.preview &&
                    options.critPause !== false,
                resume,
                seed: replay?.seed,
                run: (rolls) => executeCast(plan, rolls),
            }
        );
    };
}

export type { SpellMutationDeps } from '@/lib/server/battles/mutations/spell/cast-types';
