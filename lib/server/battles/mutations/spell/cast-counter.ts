import { textRef } from '@/lib/i18n/text-ref';
import type { SpellRequestData } from '@/lib/schemas/battles';
import { spendLegendaryCast } from '@/lib/server/battles/mutations/spell/cast-execute';
import type {
    CastPlan,
    Spellcast,
    SpellMutationDeps,
} from '@/lib/server/battles/mutations/spell/cast-types';
import {
    isActive,
    updateParticipant,
} from '@/lib/utils/abilities/engine/core/participants';
import { reactionsOf } from '@/lib/utils/battle/actions/access';
import { counterReactors } from '@/lib/utils/battle/counter/eligibility';
import { openCounterWindow } from '@/lib/utils/battle/counter/pending';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { spendCastEconomy } from '@/lib/utils/battle/spell/cast/finish';
import { actorEvent } from '@/lib/utils/battle/store';
import type { BattleParticipant } from '@/types/battle';

const SEED_SPACE = 2 ** 32;

/** Pauses the cast for a counter window when an enemy can interrupt it; null = resolve normally */
export async function openCounterIfAny(args: {
    ctx: BattleMutationContext;
    deps: SpellMutationDeps;
    data: SpellRequestData;
    spell: Spellcast;
    caster: BattleParticipant;
    order: BattleParticipant[];
    diceRolls: number[];
    serverRolls: boolean;
}): Promise<MutationResult | null> {
    const { ctx, deps, data, spell, caster, order } = args;

    if (!deps.loadInterruptSpells) return null;

    const blocker = reactionsOf(ctx.meta.rules).blocker;

    const candidates = order.filter(
        (p) =>
            p.basicInfo.side !== caster.basicInfo.side &&
            isActive(p) &&
            blocker(p) === null &&
            (p.spellcasting.knownSpells.length > 0 ||
                (p.spellcasting.grants?.length ?? 0) > 0)
    );

    if (candidates.length === 0) return null;

    const ids = [
        ...new Set(
            candidates.flatMap((p) => [
                ...p.spellcasting.knownSpells,
                ...(p.spellcasting.grants ?? []).map((g) => g.spellId),
            ])
        ),
    ];

    const interruptSpells = await deps.loadInterruptSpells(
        ctx.scene.campaignId,
        ids
    );

    const offers = counterReactors({
        caster,
        castSpell: { level: spell.level, components: spell.components },
        participants: order,
        interruptSpells,
        rules: ctx.meta.rules,
        map: ctx.meta.map,
        round: ctx.scene.round,
    });

    if (offers.length === 0) return null;

    return openCounterWindow(ctx, {
        caster,
        spell: { name: spell.name, level: spell.level },
        offers,
        request: { ...data, diceRolls: args.diceRolls },
        serverRolls: args.serverRolls,
        now: Date.now(),
        seed: Math.floor((ctx.rng ?? Math.random)() * SEED_SPACE),
    });
}

/** The countered cast: action economy is spent, slot/charges/ingredients/concentration are untouched */
export function counteredResult(plan: CastPlan, by: string): MutationResult {
    const { ctx, caster, order, spell, source } = plan;

    const { free, grant, legendaryAbility } = source;

    const spent = updateParticipant(order, caster.basicInfo.id, (p) =>
        spendCastEconomy(p, spell.definition.cost, {
            isDMCast: free,
            isLegendaryCast: !!legendaryAbility,
            grant,
        })
    );

    return {
        participants: legendaryAbility
            ? spendLegendaryCast(spent, plan, legendaryAbility)
            : spent,
        pending: ctx.pending,
        events: [
            actorEvent(
                ctx.scene.round,
                caster,
                textRef('battleLog.counter.countered', {
                    caster: caster.basicInfo.name,
                    spell: spell.name,
                    reactor: by,
                }),
                { actionDetails: { countered: true } }
            ),
        ],
    };
}
