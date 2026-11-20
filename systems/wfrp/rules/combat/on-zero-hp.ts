import { editionOf } from '../edition';
import { applyWfrpCrit } from './crit-effect';
import { rollCrit } from './crit-table';
import { isOutOfFight, startDeathTimer } from './critical';
import { asLocation, hitLocation } from './location';

import { CombatStatus } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import { replaceParticipant } from '@/lib/utils/abilities/engine/core/participants';
import type { DamageConsequencesResult } from '@/lib/utils/battle/damage/consequences';
import { rollDie } from '@/lib/utils/common/dice';
import type { ZeroHpCtx } from '@/lib/utils/rules/systems/types';
import type { BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

/** Canon5e: a Critical Wound only comes from damage beyond 0, +10 on the roll per excess Wound (p171) */
function criticalOnZeroHp(ctx: ZeroHpCtx): DamageConsequencesResult {
    const { before, after, participants } = ctx;

    if (
        after.combatStats.currentHp > 0 ||
        after.combatStats.status === CombatStatus.DEAD ||
        (isOutOfFight(before) &&
            before.combatStats.status !== CombatStatus.ACTIVE)
    )
        return { participant: after, participants, messages: [] };

    // primitives without rules (raw spell damage) already set Unconscious at 0 HP: undo it, only crits knock out
    let next: BattleParticipant =
        ctx.manual || before.combatStats.status === CombatStatus.UNCONSCIOUS
            ? after
            : {
                  ...after,
                  combatStats: {
                      ...after.combatStats,
                      status: before.combatStats.status,
                  },
              };

    const messages: LogLine[] = [];

    const excess = Math.max(
        0,
        ctx.amount - before.combatStats.currentHp - before.combatStats.tempHp
    );

    if (!ctx.manual && excess > 0) {
        // a critical hit already rolled at the struck spot: the second wound lands elsewhere (p171)
        const location = ctx.crit
            ? hitLocation(rollDie(100, ctx.rng))
            : asLocation(ctx.location);

        const applied = applyWfrpCrit(
            next,
            rollCrit(location, ctx.rules, ctx.rng, undefined, excess * 10),
            ctx.round ?? 0,
            editionOf(ctx.rules)
        );

        next = applied.participant;
        messages.push(applied.message);
    } else next = startDeathTimer(next);

    return {
        participant: next,
        participants: replaceParticipant(participants, next),
        messages,
    };
}

export function wfrpOnZeroHp(ctx: ZeroHpCtx): DamageConsequencesResult {
    if (editionOf(ctx.rules).woundModel === 'critical')
        return criticalOnZeroHp(ctx);

    const { before, after, participants } = ctx;

    const wentDown =
        before.combatStats.currentHp > 0 &&
        after.combatStats.currentHp <= 0 &&
        after.combatStats.status !== CombatStatus.DEAD;

    if (!wentDown) return { participant: after, participants, messages: [] };

    const alreadyDown = before.combatStats.status === CombatStatus.UNCONSCIOUS;

    let next: BattleParticipant = {
        ...after,
        combatStats: { ...after.combatStats, status: CombatStatus.UNCONSCIOUS },
    };

    if (alreadyDown)
        return {
            participant: next,
            participants: replaceParticipant(participants, next),
            messages: [],
        };

    const messages: LogLine[] = [
        textRef('battleWfrp.log.unconscious', { name: after.basicInfo.name }),
    ];

    // a doubles crit (ctx.crit) was already rolled for this blow
    if (!ctx.manual && !ctx.crit) {
        const applied = applyWfrpCrit(
            next,
            {
                ...rollCrit(asLocation(ctx.location), ctx.rules, ctx.rng),
                bonusDamage: 0,
            },
            ctx.round ?? 0
        );

        next = applied.participant;
        messages.push(applied.message);
    }

    return {
        participant: next,
        participants: replaceParticipant(participants, next),
        messages,
    };
}
