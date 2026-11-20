import { API_ERRORS } from '@/lib/constants/api-errors';
import { textRef } from '@/lib/i18n/text-ref';
import type { CastPlan } from '@/lib/server/battles/mutations/spell/cast-types';
import {
    findParticipant,
    updateParticipant,
} from '@/lib/utils/abilities/engine/core/participants';
import type { Rng } from '@/lib/utils/abilities/engine/core/types';
import { recordUse } from '@/lib/utils/abilities/engine/core/usage';
import { lairOf } from '@/lib/utils/battle/actions/access';
import {
    legendaryCostOf,
    spendLegendary,
} from '@/lib/utils/battle/actions/legendary-options';
import type { CritPicker } from '@/lib/utils/battle/crit-choice/types';
import { spellDiceRolls } from '@/lib/utils/battle/dice-record';
import { withLines, withPrefix } from '@/lib/utils/battle/log/lines';
import { viewerOf } from '@/lib/utils/battle/pipeline/battle-response';
import type { MutationResult } from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { castSpell } from '@/lib/utils/battle/spell';
import {
    flatEffects,
    isDamageEffect,
} from '@/lib/utils/battle/spell/cast/state';
import {
    spendIngredients,
    spentSummary,
} from '@/lib/utils/battle/spell/ingredients';
import { spellSaveDc } from '@/lib/utils/battle/spell/save-dc';
import {
    spellTerrainEffects,
    spellZoneHazard,
} from '@/lib/utils/battle/spell/zone-hazard';
import { battleActionToEvent, BattleRuleError } from '@/lib/utils/battle/store';
import { applyAbilitySummons } from '@/lib/utils/battle/summon/ability-summons';
import { applyTransforms } from '@/lib/utils/battle/transform/apply-transforms';
import { sanitizeLogEntry } from '@/lib/utils/battle/view';
import { currencyValueOf, ruleSystemOf } from '@/lib/utils/rules/systems';
import type { BattleParticipant } from '@/types/battle';

const healsByDefinition = (effects: Parameters<typeof flatEffects>[0]) => {
    const flat = flatEffects(effects);

    return (
        flat.some((e) => e.kind === 'heal' || e.kind === 'hot') &&
        !flat.some(isDamageEffect)
    );
};

/** The cast is a system Casting test (not a free, legendary or granted cast) */
export const runsCastTest = ({ ctx, source }: Pick<CastPlan, 'ctx' | 'source'>) =>
    !source.free &&
    !source.legendaryAbility &&
    !source.grant &&
    !!ruleSystemOf(ctx.meta.rules).magic.tested;

export async function executeCast(
    plan: CastPlan,
    { rng, crit }: { rng: Rng; crit: CritPicker }
): Promise<MutationResult> {
    const {
        ctx,
        data,
        spell,
        caster,
        order,
        source,
        chosen,
        resolution,
        expected,
        diceRolls,
    } = plan;

    const { trusted, serverRolled } = plan.saves;

    const { legendaryAbility, free, grant } = source;

    const result = castSpell({
        caster,
        spell,
        targetIds: resolution.targetIds,
        allParticipants: order,
        currentRound: ctx.scene.round,
        battleId: ctx.scene.id,
        diceRolls,
        saveRolls: trusted,
        attackRolls: data.attackRolls,
        dice: expected,
        isDMCast: free,
        isLegendaryCast: !!legendaryAbility,
        grant,
        castLevel: plan.castLevel,
        optionIndex: data.optionIndex,
        ...(data.pickedId && { pickedId: data.pickedId }),
        ...(plan.pickedSpell && { pickedSpell: plan.pickedSpell }),
        ...(chosen?.ok && { slotKey: data.slotKey }),
        rng,
        crit,
        map: ctx.meta.map,
        ...(resolution.centre && { aim: resolution.centre }),
        rules: ctx.meta.rules,
        ...(data.preview && { dryRun: true }),
        ...(plan.ingredients && { ingredientUsed: true }),
        ...(plan.cancelledBy !== undefined && {
            cancelledBy: plan.cancelledBy,
        }),
        ...(!free &&
            !legendaryAbility &&
            !grant && {
                castTest: {
                    roll: data.castRoll,
                    serverRoll:
                        data.serverRoll ??
                        (plan.serverRolls ? true : undefined),
                    system: plan.system,
                },
            }),
    });

    if (result.reason === 'systemMismatch')
        throw new BattleRuleError(
            'action_rejected',
            API_ERRORS.BATTLE_SPELL_SYSTEM_MISMATCH
        );

    if (!result.success)
        throw new BattleRuleError(
            'action_rejected',
            API_ERRORS.BATTLE_NO_FREE_SLOT
        );

    const groups = spellDiceRolls({
        casterId: caster.basicInfo.id,
        sides: expected.sides,
        rolls: diceRolls,
        heal: healsByDefinition(spell.definition.effects),
        saves: result.battleAction.actionDetails.savingThrows ?? [],
        presetSaveIds: new Set(trusted.map((s) => s.participantId)),
    });

    if (groups.length > 0 && !result.fizzled)
        result.battleAction.actionDetails.diceRolls = groups;

    if (resolution.centre)
        result.battleAction.actionDetails.aimCell = resolution.centre;

    if (serverRolled.length > 0) {
        result.battleAction = withLines(result.battleAction, [
            textRef('battleLog.spell.serverSaves', {
                names: serverRolled
                    .map(
                        (id) => findParticipant(order, id)?.basicInfo.name ?? id
                    )
                    .join(', '),
            }),
        ]);
    }

    if (data.preview) {
        const battleAction = ctx.isDM
            ? result.battleAction
            : sanitizeLogEntry(
                  result.battleAction,
                  viewerOf({ userId: ctx.userId }, order),
                  { participants: order, rules: ctx.meta.rules }
              );

        return {
            participants: order,
            pending: ctx.pending,
            events: [],
            response: {
                preview: true,
                battleAction: { ...battleAction, stateBefore: undefined },
                ...(resolution.cells && { cells: resolution.cells }),
            },
        };
    }

    return finalizeCast(plan, result, rng);
}

function fizzleResult(
    { ctx, caster, ingredients }: CastPlan,
    result: ReturnType<typeof castSpell>
): MutationResult {
    const stock = caster.battleData.ingredientStock;

    if (!ingredients || !stock)
        return {
            participants: result.allParticipantsUpdated,
            pending: ctx.pending,
            events: [battleActionToEvent(result.battleAction)],
        };

    const participants = updateParticipant(
        result.allParticipantsUpdated,
        caster.basicInfo.id,
        (p) => spendIngredients(p, ingredients)
    );

    const action = withLines(result.battleAction, [
        textRef('battleLog.spell.ingredientsSpent', {
            name: caster.basicInfo.name,
            list: spentSummary(
                stock,
                ingredients,
                currencyValueOf(ctx.meta.rules)
            ),
        }),
    ]);

    return {
        participants,
        pending: ctx.pending,
        events: [battleActionToEvent(action)],
    };
}

export function spendLegendaryCast(
    order: BattleParticipant[],
    { ctx, caster }: Pick<CastPlan, 'ctx' | 'caster'>,
    ability: NonNullable<CastPlan['source']['legendaryAbility']>
): BattleParticipant[] {
    return updateParticipant(order, caster.basicInfo.id, (p) => {
        const used = recordUse(
            p,
            ability.key,
            ctx.scene.round,
            ability.limits?.pool
        );

        return ability.limits?.lair
            ? lairOf(ctx.meta.rules).spend(
                  used,
                  ctx.scene.round,
                  ability.key
              )
            : spendLegendary(used, legendaryCostOf(ability));
    });
}

async function finalizeCast(
    plan: CastPlan,
    result: ReturnType<typeof castSpell>,
    rng: Rng
): Promise<MutationResult> {
    const { ctx, spell, caster, resolution, deps } = plan;

    const { legendaryAbility, grant } = plan.source;

    if (result.fizzled) return fizzleResult(plan, result);

    const summoned = await applyAbilitySummons(
        result.summons.map((r) =>
            r.inline && resolution.centre
                ? { ...r, atCell: resolution.centre }
                : r
        ),
        result.allParticipantsUpdated,
        {
            campaignId: ctx.scene.campaignId,
            battleId: ctx.scene.id,
            rng,
            rules: ctx.meta.rules,
            deps,
            map: ctx.meta.map,
            round: ctx.scene.round,
        }
    );

    const transformed = await applyTransforms(
        summoned.order,
        result.transforms ?? [],
        {
            campaignId: ctx.scene.campaignId,
            battleId: ctx.scene.id,
            rules: ctx.meta.rules,
            deps,
            round: ctx.scene.round,
        }
    );

    summoned.order = transformed.order;
    summoned.messages.push(...transformed.messages);

    if (legendaryAbility)
        summoned.order = spendLegendaryCast(
            summoned.order,
            plan,
            legendaryAbility
        );

    if (legendaryAbility)
        result.battleAction = withPrefix(
            result.battleAction,
            `${legendaryAbility.limits?.lair ? '🏰' : '👑'} ${legendaryAbility.name} — `
        );

    const { ingredients } = plan;

    const stock = caster.battleData.ingredientStock;

    if (ingredients && stock) {
        summoned.order = updateParticipant(
            summoned.order,
            caster.basicInfo.id,
            (p) => spendIngredients(p, ingredients)
        );
        summoned.messages.push(
            textRef('battleLog.spell.ingredientsSpent', {
                name: caster.basicInfo.name,
                list: spentSummary(
                    stock,
                    ingredients,
                    currencyValueOf(ctx.meta.rules)
                ),
            })
        );
    }

    const action = withLines(result.battleAction, summoned.messages);

    const dc =
        grant?.dc ?? spellSaveDc(ctx.meta.rules, caster, grant?.dcAbility);

    const zoneMap = spellZoneHazard({
        map: ctx.meta.map,
        spell,
        cells: resolution.cells,
        round: ctx.scene.round,
        spellDamage: result.spellDamage,
        concentrationOf: result.concentration,
        casterId: caster.basicInfo.id,
        dc,
        dice: result.spellDice,
        centre: resolution.centre,
        castKey: result.concentration?.castId,
    });

    const terrainMap = spellTerrainEffects({
        map: zoneMap ?? ctx.meta.map,
        effects: spell.definition.effects.filter(
            (e) => e.kind === 'createTerrain'
        ),
        spell,
        caster,
        participants: summoned.order,
        targetIds: resolution.targetIds,
        cells: resolution.cells,
        round: ctx.scene.round,
        concentrationOf: result.concentration,
        dc,
    });

    const map = terrainMap ?? zoneMap;

    return {
        participants: summoned.order,
        pending: ctx.pending,
        events: [battleActionToEvent(action)],
        ...(map && { scene: { map } }),
        ...(result.interruptedIds && {
            response: { interruptedIds: result.interruptedIds },
        }),
    };
}
