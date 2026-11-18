import { getCachedSummonPool } from '@/lib/cache/reference-data';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import type { SpellRequestData } from '@/lib/schemas/battles';
import { executeCast } from '@/lib/server/battles/mutations/spell/cast-execute';
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
import { ruleSystemOf } from '@/lib/utils/rules/systems';

const defaultDeps: SpellMutationDeps = {
    loadSpell: (id, campaignId) =>
        prisma.spell.findFirst({ where: { id, campaignId } }),
    loadPool: getCachedSummonPool,
};

export function createSpellMutation(
    deps: SpellMutationDeps = defaultDeps,
    options: { serverRolls?: boolean } = {}
) {
    return async (
        ctx: BattleMutationContext,
        data: SpellRequestData,
        resume?: CritResume
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

        const { expected, diceRolls } = prepareCastDice(
            ctx,
            data,
            caster,
            spell,
            castLevel,
            !!options.serverRolls
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
        };

        return runWithCritChoice(ctx, {
            action: 'spell',
            actorId: data.casterId,
            request: { ...data, diceRolls },
            enabled: ctx.meta.critChoiceByDm && !data.preview,
            resume,
            run: (rolls) => executeCast(plan, rolls),
        });
    };
}

export type { SpellMutationDeps } from '@/lib/server/battles/mutations/spell/cast-types';
