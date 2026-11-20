import { applyWfrpConditionTo } from '../conditions/apply';
import { editionOf } from '../edition';
import { wfrpState, withWfrpState } from '../state';
import { rollSlot, rowText } from '../tables/resolve';
import { CHANNEL_MISCAST_STEP, SIN_WRATH_STEP } from './constants';

import { textRef } from '@/lib/i18n/text-ref';
import {
    findParticipant,
    replaceParticipant,
} from '@/lib/utils/abilities/engine/core/participants';
import { dropBreakOnDamage } from '@/lib/utils/abilities/engine/effects/hp';
import type { Rng } from '@/lib/utils/common/rng';
import type { Ruleset } from '@/lib/utils/rules';
import type {
    ApplyDamageConsequences,
    SystemConditionResult,
} from '@/lib/utils/rules/systems/types';
import type { BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

export function wfrpMiscast(
    ps: BattleParticipant[],
    casterId: string,
    kind: string,
    ctx: {
        round: number;
        rng: Rng;
        rules: Ruleset;
        applyDamage: ApplyDamageConsequences;
        presetRoll?: number;
    }
): SystemConditionResult {
    const caster = findParticipant(ps, casterId);

    if (!caster) return { participants: ps, messages: [] };

    const canonModel = editionOf(ctx.rules).magicModel === 'canon5e';

    const canonWrath = kind === 'wrath' && canonModel;

    const sin = canonWrath ? (wfrpState(caster).sin ?? 0) : 0;

    const lostSl = canonModel ? (wfrpState(caster).miscastSl ?? 0) : 0;

    const { row } = rollSlot(
        ctx.rules,
        kind === 'wrath'
            ? 'wrath'
            : kind === 'major'
              ? 'miscastMajor'
              : 'miscastMinor',
        ctx.rng,
        ctx.presetRoll,
        sin * SIN_WRATH_STEP + lostSl * CHANNEL_MISCAST_STEP
    );

    const effect = rowText(row);

    const name = caster.basicInfo.name;

    const messages: LogLine[] = [
        textRef(
            kind === 'wrath' ? 'wfrpMagic.log.wrath' : 'wfrpMagic.log.miscast',
            { name, effect }
        ),
    ];

    let participants = lostSl
        ? replaceParticipant(
              ps,
              withWfrpState(caster, { miscastSl: undefined })
          )
        : ps;

    for (const e of row.effects) {
        if (e.type !== 'condition') continue;

        const target = findParticipant(participants, casterId) ?? caster;

        const applied = applyWfrpConditionTo(target, {
            key: e.key,
            levels: e.levels,
            round: ctx.round,
            edition: editionOf(ctx.rules),
            sourceName: effect,
            concealed: true,
        });

        participants = replaceParticipant(participants, applied.participant);

        messages.push(...applied.messages);
    }

    const wounds = row.effects.reduce(
        (sum, e) => (e.type === 'wounds' ? sum + e.amount : sum),
        0
    );

    const found = findParticipant(participants, casterId);

    const pool = canonModel ? (found && wfrpState(found).channelledSl) : 0;

    // The pool is parked during the wound so it cannot trigger a second Cool test
    const before =
        pool && found ? withWfrpState(found, { channelledSl: undefined }) : found;

    if (wounds > 0 && before) {
        const after = dropBreakOnDamage(
            {
                ...before,
                combatStats: {
                    ...before.combatStats,
                    currentHp: Math.max(
                        0,
                        before.combatStats.currentHp - wounds
                    ),
                },
            },
            wounds
        );

        const r = ctx.applyDamage({
            before,
            after,
            amount: wounds,
            rules: ctx.rules,
            rng: ctx.rng,
            participants: replaceParticipant(participants, after),
            round: ctx.round,
        });

        participants = r.participants;

        messages.push(...r.messages);

        const hurt = pool ? findParticipant(participants, casterId) : undefined;

        if (hurt)
            participants = replaceParticipant(
                participants,
                withWfrpState(hurt, { channelledSl: pool })
            );
    }

    if (canonWrath && sin > 0) {
        const current = findParticipant(participants, casterId);

        if (current)
            participants = replaceParticipant(
                participants,
                withWfrpState(current, {
                    sin: sin > 1 ? sin - 1 : undefined,
                })
            );
    }

    return { participants, messages };
}
