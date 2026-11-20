import { API_ERRORS } from '@/lib/constants/api-errors';
import { textRef } from '@/lib/i18n/text-ref';
import type { SpellRequestData } from '@/lib/schemas/battles';
import type {
    ChosenSlot,
    Spellcast,
    SpellDefinition,
    SpellMutationDeps,
    SpellSource,
} from '@/lib/server/battles/mutations/spell/cast-types';
import { parseSystemInput } from '@/lib/server/battles/system-input';
import {
    replaceParticipant,
    updateParticipant,
} from '@/lib/utils/abilities/engine/core/participants';
import { reactionsOf } from '@/lib/utils/battle/actions/access';
import { hasEffectMarker } from '@/lib/utils/battle/participant/state';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { armorPenalty } from '@/lib/utils/battle/proficiency';
import { optionInRange } from '@/lib/utils/battle/spell/cast/state';
import {
    peekInlineGrant,
    withInlineDefinition,
} from '@/lib/utils/battle/spell/inline-grant';
import { prepareLongCast } from '@/lib/utils/battle/spell/long-cast';
import { toCastableSpell } from '@/lib/utils/battle/spell/to-castable';
import {
    BattleAccessError,
    BattleRuleError,
    ruleErrorOf,
    systemEvent,
} from '@/lib/utils/battle/store';
import { assertCanAct } from '@/lib/utils/battle/turn';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { BattleParticipant } from '@/types/battle';
export function assertSpellRequestAllowed(
    ctx: BattleMutationContext,
    data: SpellRequestData,
    definition: SpellDefinition
) {
    if (definition.executionMode === 'manual' && !data.cancelCasting)
        throw new BattleRuleError(
            'action_rejected',
            API_ERRORS.BATTLE_SPELL_CONFIGURE_OR_MANUAL
        );

    if (
        !data.cancelCasting &&
        !optionInRange(definition.effects, data.optionIndex)
    )
        throw new BattleRuleError(
            'action_rejected',
            API_ERRORS.BATTLE_SPELL_OPTION_REQUIRED
        );

    if (data.legendaryKey && !ctx.isDM)
        throw new BattleAccessError(403, API_ERRORS.BATTLE_LEGENDARY_DM_ONLY);

    if (data.legendaryKey && (data.free || data.slotKey))
        throw new BattleRuleError(
            'action_rejected',
            API_ERRORS.BATTLE_LEGENDARY_CAST_NO_SLOT
        );
}

export function cancelCast(
    ctx: BattleMutationContext,
    order: BattleParticipant[],
    caster: BattleParticipant
): MutationResult {
    const dropped = ruleSystemOf(ctx.meta.rules).magic.sustain.drop(
        order,
        caster.basicInfo.id,
        textRef('battleLog.concentration.reasons.castCancelled')
    );

    const cleared = updateParticipant(
        dropped.participants,
        caster.basicInfo.id,
        (p) =>
            p.battleData.pendingCast
                ? {
                      ...p,
                      battleData: { ...p.battleData, pendingCast: undefined },
                  }
                : p
    );

    return {
        participants: cleared,
        pending: ctx.pending,
        events: [
            systemEvent(
                ctx.scene.round,
                textRef('battleLog.spell.castCancelled', {
                    name: caster.basicInfo.name,
                })
            ),
        ],
    };
}

export async function assertCasterMayCast(
    ctx: BattleMutationContext,
    data: SpellRequestData,
    caster: BattleParticipant,
    spell: Spellcast,
    source: SpellSource,
    serverRolls: boolean
) {
    const { definition } = spell;

    const { legendaryAbility, free, grant } = source;

    const tested =
        !!ruleSystemOf(ctx.meta.rules).magic.tested &&
        !free &&
        !legendaryAbility &&
        !grant;

    if (
        tested &&
        (!definition.casting?.magic ||
            definition.resolution.kind !== 'auto' ||
            definition.cost === 'long')
    )
        throw new BattleRuleError(
            'action_rejected',
            API_ERRORS.BATTLE_SPELL_SYSTEM_MISMATCH
        );

    const system = await parseSystemInput(
        ctx.meta.rules,
        'castInput',
        data,
        serverRolls || !!data.serverRoll
    );

    if (system)
        ruleSystemOf(ctx.meta.rules).combat.input?.assert(system, {
            kind: 'cast',
            actor: caster,
            free: !!data.free,
            tested,
        });

    ruleSystemOf(ctx.meta.rules).combat.assertAction?.({
        kind: 'cast',
        actor: caster,
    });

    if (!data.preview && !legendaryAbility)
        assertActionAvailable(ctx, caster, spell, free, !!grant?.noAction);

    if (hasEffectMarker(caster, 'disable_spell_casting')) {
        throw new BattleRuleError(
            'action_rejected',
            API_ERRORS.BATTLE_CASTER_CANNOT_CAST
        );
    }

    if (armorPenalty(caster))
        throw new BattleRuleError(
            'action_rejected',
            API_ERRORS.BATTLE_CASTER_ARMOR_NOT_PROFICIENT
        );

    return system;
}

export function chooseSlot(
    ctx: BattleMutationContext,
    data: SpellRequestData,
    caster: BattleParticipant,
    spell: Spellcast,
    source: SpellSource
): ChosenSlot {
    const { legendaryAbility, free, grant } = source;

    const resource = ruleSystemOf(ctx.meta.rules).magic.resource;

    const chosen =
        resource &&
        !free &&
        !legendaryAbility &&
        !grant &&
        data.slotKey &&
        resource.picksSlot(caster)
            ? resource.canCast(caster, {
                  level: spell.level,
                  slotKey: data.slotKey,
              })
            : null;

    if (chosen && !chosen.ok)
        throw ruleErrorOf('action_rejected', chosen.error);

    return chosen;
}

export async function loadCastableSpell(
    deps: SpellMutationDeps,
    ctx: BattleMutationContext,
    data: SpellRequestData,
    order: BattleParticipant[]
): Promise<Spellcast> {
    const spellRow = await deps.loadSpell(data.spellId, ctx.scene.campaignId);

    if (!spellRow || spellRow.campaignId !== ctx.scene.campaignId)
        throw new BattleAccessError(404, API_ERRORS.BATTLE_SPELL_NOT_FOUND);

    const inlineGrant = peekInlineGrant(order, data.casterId, data);

    const base = toCastableSpell(spellRow);

    return inlineGrant ? withInlineDefinition(base, inlineGrant) : base;
}

function assertActionAvailable(
    ctx: BattleMutationContext,
    caster: BattleParticipant,
    spell: Spellcast,
    free: boolean,
    noAction = false
): void {
    const { definition } = spell;

    if (definition.cost === 'reaction' && !free) {
        const blocker = reactionsOf(ctx.meta.rules).blocker(caster);

        if (blocker) throw ruleErrorOf('action_rejected', blocker);
    } else assertCanAct(ctx, caster.basicInfo.id, { skipGate: free });

    const isBonus = definition.cost === 'bonusAction';

    // attack and spell share one turn action; a DM free cast does not spend it

    if (
        !free &&
        !noAction &&
        definition.cost !== 'reaction' &&
        (isBonus
            ? caster.actionFlags.hasUsedBonusAction
            : caster.actionFlags.hasUsedAction)
    ) {
        throw new BattleRuleError(
            'action_used',
            isBonus ? API_ERRORS.BONUS_ACTION_USED : API_ERRORS.ACTION_USED
        );
    }
}

export function beginLongCast(
    ctx: BattleMutationContext,
    order: BattleParticipant[],
    caster: BattleParticipant,
    spell: Spellcast,
    data: SpellRequestData,
    opts: {
        grantKey: string | undefined;
        castLevel: number | undefined;
        hasGrant: boolean;
    }
):
    | { result: MutationResult }
    | { caster: BattleParticipant; order: BattleParticipant[] } {
    const resource = ruleSystemOf(ctx.meta.rules).magic.resource;

    if (
        !opts.hasGrant &&
        resource &&
        !resource.canCast(caster, {
            level: spell.level,
            slotKey: resource.picksSlot(caster) ? data.slotKey : undefined,
        }).ok
    )
        throw new BattleRuleError(
            'action_rejected',
            API_ERRORS.BATTLE_NO_FREE_SLOT_TO_CAST
        );

    const prepared = prepareLongCast(
        { ...ctx, participants: order },
        caster,
        spell,
        {
            grantKey: opts.grantKey,
            slotKey: data.slotKey,
            castLevel: opts.castLevel,
        },
        data.castingRounds
    );

    if (!prepared.ready)
        return {
            result: {
                participants: prepared.participants,
                pending: ctx.pending,
                events: [prepared.event],
            },
        };

    return {
        caster: prepared.caster,
        order: replaceParticipant(prepared.participants, prepared.caster),
    };
}
