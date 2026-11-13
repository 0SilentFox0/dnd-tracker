import type { AbilityKey } from '@/lib/constants/abilities';
import { textRef } from '@/lib/i18n/text-ref';
import {
    findParticipant,
    isActive,
    resolvedAbilitiesOf,
} from '@/lib/utils/abilities/engine/core/participants';
import { withinLimits } from '@/lib/utils/abilities/engine/core/usage';
import type { CunningStrikeEffect } from '@/lib/utils/abilities/schema';
import {
    disengageEffect,
    upsertLabeled,
} from '@/lib/utils/battle/actions/effects';
import {
    type ActionFlow,
    getP,
    put,
} from '@/lib/utils/battle/common/action-flow';
import { savesOf } from '@/lib/utils/battle/saves/access';
import { REJECT } from '@/lib/utils/battle/store/reject';
import { diceCount } from '@/lib/utils/common/dice';
import type { Ruleset } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { BattleParticipant } from '@/types/battle';
import type { TextRef } from '@/types/text';

export const CUNNING_STRIKE_LABELS: Record<CunningStrikeEffect, TextRef> = {
    poison: textRef('battleCommon.cunningStrike.poison'),
    trip: textRef('battleCommon.cunningStrike.trip'),
    withdraw: textRef('battleCommon.cunningStrike.withdraw'),
};

const CONDITION_ROUNDS = 10;

export interface CunningStrikeOffer {
    options: { effect: CunningStrikeEffect; dice: number }[];
    maxEffects: number;
    sneakKey: string;
    sneakDice: number;
}

export function cunningStrikeOffer(
    attacker: BattleParticipant,
    round: number
): CunningStrikeOffer | null {
    const abilities = resolvedAbilitiesOf(attacker);

    const sneak = abilities.find((a) => a.params?.sneakAttack);

    const params = abilities.flatMap((a) => a.params?.cunningStrike ?? []);

    if (!sneak || params.length === 0 || !withinLimits(attacker, sneak, round))
        return null;

    const dealt = sneak.effects.find((e) => e.kind === 'dealDamage');

    const sneakDice =
        dealt && typeof dealt.amount === 'string' ? diceCount(dealt.amount) : 0;

    const options = params.flatMap((p) => p.options ?? []);

    if (sneakDice === 0 || options.length === 0) return null;

    return {
        options,
        maxEffects: Math.max(1, ...params.map((p) => p.maxEffects ?? 1)),
        sneakKey: sneak.key,
        sneakDice,
    };
}

/** Повертає вартість у кубиках, або текст відмови. */
export function cunningStrikeCost(
    offer: CunningStrikeOffer | null,
    effects: CunningStrikeEffect[]
): number | TextRef {
    if (!offer) return textRef(REJECT.cunningUnavailable);

    if (new Set(effects).size !== effects.length)
        return textRef(REJECT.cunningRepeat);

    if (effects.length > offer.maxEffects)
        return textRef(REJECT.cunningMax, { max: offer.maxEffects });

    let cost = 0;

    for (const effect of effects) {
        const option = offer.options.find((o) => o.effect === effect);

        if (!option) return textRef(REJECT.cunningLocked, { effect });

        cost += option.dice;
    }

    return cost > offer.sneakDice ? textRef(REJECT.cunningDice) : cost;
}

export function toggleCunningStrike(
    selected: CunningStrikeEffect[],
    effect: CunningStrikeEffect,
    offer: CunningStrikeOffer
): CunningStrikeEffect[] {
    if (selected.includes(effect)) return selected.filter((e) => e !== effect);

    const next = offer.maxEffects === 1 ? [effect] : [...selected, effect];

    return typeof cunningStrikeCost(offer, next) === 'number' ? next : selected;
}

const SAVE_ABILITY: Record<'poison' | 'trip', AbilityKey> = {
    poison: 'constitution',
    trip: 'dexterity',
};

export const cunningStrikeDc = (
    attacker: BattleParticipant,
    rules: Ruleset
): number => {
    const { saves, proficiency } = ruleSystemOf(rules).combat;

    return (
        8 + saves.modifiers(attacker).dexterity + proficiency.bonus(attacker)
    );
};

export function applyCunningStrikeEffects(
    flow: ActionFlow,
    attackerId: string,
    targetId: string,
    effects: CunningStrikeEffect[]
): void {
    for (const effect of effects) {
        const attacker = getP(flow, attackerId);

        if (effect === 'withdraw') {
            put(
                flow,
                upsertLabeled(
                    attacker,
                    disengageEffect(attackerId),
                    flow.ctx.round
                )
            );
            flow.messages.push(
                textRef('battleLog.cunning.withdraw', {
                    effect: CUNNING_STRIKE_LABELS.withdraw,
                    name: attacker.basicInfo.name,
                })
            );
            continue;
        }

        const target = findParticipant(flow.ps, targetId);

        if (!target || !isActive(target)) continue;

        const ability = SAVE_ABILITY[effect];

        const dc = cunningStrikeDc(attacker, flow.ctx.rules);

        const save = savesOf(flow.ctx.rules).roll({
            target,
            ability,
            dc,
            participants: flow.ps,
            rules: flow.ctx.rules,
            rng: flow.ctx.rng,
        });

        const label = textRef('battleLog.cunning.label', {
            effect: CUNNING_STRIKE_LABELS[effect],
        });

        if (save.success) {
            flow.messages.push(
                textRef('battleLog.cunning.saved', {
                    label,
                    target: target.basicInfo.name,
                    dc,
                    total: save.total,
                })
            );
            continue;
        }

        flow.messages.push(
            textRef('battleLog.cunning.failed', {
                label,
                target: target.basicInfo.name,
                dc,
                total: save.total,
            })
        );

        const r = ruleSystemOf(flow.ctx.rules).conditionSet.apply(
            flow.ps,
            targetId,
            {
                key: effect === 'poison' ? 'poisoned' : 'prone',
                rounds: CONDITION_ROUNDS,
                permanent: effect === 'trip',
                ...(effect === 'poison' && { saveEnds: { ability, dc } }),
                source: {
                    participantId: attackerId,
                    name: attacker.basicInfo.name,
                },
                sourceName: label,
                timedKey: `cunning:${effect}@${attackerId}`,
                round: flow.ctx.round,
                rules: flow.ctx.rules,
            }
        );

        flow.ps = r.participants;
        flow.messages.push(...r.messages);
    }
}
