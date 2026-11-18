import { API_ERRORS } from '@/lib/constants/api-errors';
import type { SpellRequestData } from '@/lib/schemas/battles';
import type {
    Resolution,
    Spellcast,
    SpellSource,
} from '@/lib/server/battles/mutations/spell/cast-types';
import { findParticipant } from '@/lib/utils/abilities/engine/core/participants';
import { evaluateCondition } from '@/lib/utils/abilities/registry/conditions';
import { adjacencyOf } from '@/lib/utils/battle/grid/adjacency';
import type { BattleMutationContext } from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { inputDiceOf } from '@/lib/utils/battle/spell/cast/state';
import { casterSpellDice } from '@/lib/utils/battle/spell/caster-dice';
import {
    pacifiedBlock,
    resolveSpellTargets,
} from '@/lib/utils/battle/spell/spell-targeting';
import { BattleRuleError, ruleErrorOf } from '@/lib/utils/battle/store';
import { objectsNear } from '@/lib/utils/battle/summon/objects-near';
import { assertSpellRolls } from '@/lib/utils/battle/validation/dice-checks';
import { rollDiceList } from '@/lib/utils/common/dice';
import { rngOf } from '@/lib/utils/common/rng';
import type { BattleParticipant } from '@/types/battle';

function assertTargetsNotPacified(
    ctx: BattleMutationContext,
    order: BattleParticipant[],
    caster: BattleParticipant,
    targeting: Parameters<typeof pacifiedBlock>[2],
    targetIds: Parameters<typeof pacifiedBlock>[3]
) {
    const pacified = pacifiedBlock(
        order,
        caster,
        targeting,
        targetIds,
        ctx.meta.map
    );

    if (pacified)
        throw new BattleRuleError(
            'action_rejected',
            API_ERRORS.BATTLE_CASTER_PACIFIED,
            pacified
        );
}

function assertObjectsNear(
    ctx: BattleMutationContext,
    order: BattleParticipant[],
    caster: BattleParticipant,
    spell: Spellcast,
    targetIds: string[],
    reach: number
) {
    const orphan = targetIds.some((id) => {
        const t = findParticipant(order, id);

        return (
            !t ||
            objectsNear(
                order,
                caster.basicInfo.id,
                spell.id,
                t,
                reach,
                ctx.meta.rules
            ).length === 0
        );
    });

    if (orphan)
        throw new BattleRuleError(
            'invalid_target',
            API_ERRORS.BATTLE_SPELL_NO_OBJECT_NEAR
        );
}

export function resolveCastTargets(
    ctx: BattleMutationContext,
    data: SpellRequestData,
    order: BattleParticipant[],
    caster: BattleParticipant,
    spell: Spellcast,
    source: SpellSource,
    castLevel: number | undefined
): Resolution {
    const { definition } = spell;

    const { legendaryAbility } = source;

    assertTargetsNotPacified(
        ctx,
        order,
        caster,
        definition.targeting,
        data.targetIds
    );

    const resolution = resolveSpellTargets(
        order,
        caster,
        spell,
        definition.targeting,
        data.targetIds,
        {
            map: ctx.meta.map,
            rules: ctx.meta.rules,
            targetCell: data.targetCell,
            castLevel,
            upcastTargets: definition.upcastTargets,
        }
    );

    if (!resolution.ok) throw ruleErrorOf('invalid_target', resolution.error);

    if (definition.perObjectFeet && !data.preview)
        assertObjectsNear(
            ctx,
            order,
            caster,
            spell,
            resolution.targetIds,
            definition.perObjectFeet
        );

    assertTargetsNotPacified(
        ctx,
        order,
        caster,
        { kind: 'self' },
        resolution.targetIds
    );

    if (
        legendaryAbility?.condition &&
        !evaluateCondition(legendaryAbility.condition, {
            owner: caster,
            event: {
                type: 'action',
                actorId: caster.basicInfo.id,
                abilityKey: legendaryAbility.key,
                targetIds: resolution.targetIds,
            },
            participants: order,
            sourceId: legendaryAbility.source.id,
            adjacent: adjacencyOf(ctx.meta.map),
        })
    )
        throw new BattleRuleError(
            'action_rejected',
            API_ERRORS.BATTLE_ABILITY_CONDITION_UNMET
        );

    return resolution;
}

export function prepareCastDice(
    ctx: BattleMutationContext,
    data: SpellRequestData,
    caster: BattleParticipant,
    spell: Spellcast,
    castLevel: number | undefined,
    serverRolls: boolean
) {
    const { definition } = spell;

    const inputDice = inputDiceOf(definition.effects);

    if (inputDice && data.inputCount === undefined && !data.preview)
        throw new BattleRuleError(
            'action_rejected',
            API_ERRORS.BATTLE_SPELL_INPUT_REQUIRED
        );

    const sized = casterSpellDice(
        caster,
        {
            dice: definition.dice,
            groupId: spell.groupId,
            level: spell.level,
            dieSides: definition.dieSides,
            upcastDice: definition.upcastDice,
            fixedDice: definition.fixedDice,
        },
        ctx.meta.rules,
        castLevel
    );

    const expected = inputDice
        ? { ...sized, count: Math.min(data.inputCount ?? 1, inputDice.max) }
        : sized;

    // preview without rolls: the server rolls itself to show an estimate
    const diceRolls =
        (data.preview || serverRolls) && data.diceRolls.length === 0
            ? rollDiceList(`${expected.count}d${expected.sides}`, rngOf(ctx))
            : data.diceRolls;

    assertSpellRolls(expected, diceRolls);

    return { expected, diceRolls };
}
