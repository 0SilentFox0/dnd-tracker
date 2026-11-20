import { skillTarget, value } from '../characteristics/derive';
import { participantChars } from '../combat/participant';
import { selfSlMod, selfTestMod } from '../conditions/test-mod';
import { editionOf } from '../edition';
import { DIFFICULTY_SL, resolvePercentileTest } from '../percentile';
import { wfrpState, withWfrpState } from '../state';
import { CHANNEL_LOSS_DIE } from './constants';
import { wfrpMiscast } from './miscast';

import { textRef } from '@/lib/i18n/text-ref';
import {
    findParticipant,
    replaceParticipant,
} from '@/lib/utils/abilities/engine/core/participants';
import { applyDamageConsequences } from '@/lib/utils/battle/damage/consequences';
import { rollDie } from '@/lib/utils/common/dice';
import type { Rng } from '@/lib/utils/common/rng';
import type { Ruleset } from '@/lib/utils/rules';
import type { SystemConditionResult } from '@/lib/utils/rules/systems/types';
import type { BattleParticipant } from '@/types/battle';

type Ctx = { rules: Ruleset; rng: Rng; round: number };

const testOf = (
    p: BattleParticipant,
    skill: 'cool' | 'endurance',
    fallback: 'wp' | 't',
    difficulty: 'hard' | 'average',
    ctx: Ctx
) => {
    const chars = participantChars(p);

    const edition = editionOf(ctx.rules);

    return resolvePercentileTest({
        target:
            (skillTarget(chars, skill)?.target ?? value(chars, fallback)) +
            selfTestMod(p, 'test', edition),
        slModifier: DIFFICULTY_SL[difficulty] + selfSlMod(p, edition),
        slModel: edition.slModel,
        rng: ctx.rng,
    });
};

const passed = (outcome: string) =>
    outcome === 'success' || outcome === 'critical';

/** Hard Cool test when hit or afflicted while channelling: a failure drains 1d10 SL and a Minor miscast (p236) */
export function channelShock(
    participants: BattleParticipant[],
    id: string,
    ctx: Ctx
): SystemConditionResult {
    const p = findParticipant(participants, id);

    const held = p ? (wfrpState(p).channelledSl ?? 0) : 0;

    if (!p || held <= 0) return { participants, messages: [] };

    const test = testOf(p, 'cool', 'wp', 'hard', ctx);

    if (passed(test.outcome)) return { participants, messages: [] };

    const lost = Math.min(held, rollDie(CHANNEL_LOSS_DIE, ctx.rng));

    const left = held - lost;

    const cleared = replaceParticipant(
        participants,
        withWfrpState(p, {
            channelledSl: undefined,
            miscastSl: lost || undefined,
        })
    );

    const miscast = wfrpMiscast(
        cleared,
        id,
        wfrpState(p).malignant ? 'major' : 'minor',
        { ...ctx, applyDamage: applyDamageConsequences }
    );

    const after = findParticipant(miscast.participants, id);

    return {
        participants:
            after && left > 0
                ? replaceParticipant(
                      miscast.participants,
                      withWfrpState(after, { channelledSl: left })
                  )
                : miscast.participants,
        messages: [
            textRef('wfrpMagic.log.channelLost', {
                name: p.basicInfo.name,
                lost,
                left,
            }),
            ...miscast.messages,
        ],
    };
}

/** An unattended pool needs an Average Endurance test each turn or it fades (p236) */
export function channelUpkeep(
    participants: BattleParticipant[],
    id: string,
    ctx: Ctx
): SystemConditionResult {
    const p = findParticipant(participants, id);

    const held = p ? (wfrpState(p).channelledSl ?? 0) : 0;

    if (!p || held <= 0 || wfrpState(p).channelledNow)
        return { participants, messages: [] };

    const test = testOf(p, 'endurance', 't', 'average', ctx);

    const name = p.basicInfo.name;

    if (passed(test.outcome))
        return {
            participants,
            messages: [textRef('wfrpMagic.log.channelKept', { name, left: held })],
        };

    return {
        participants: replaceParticipant(
            participants,
            withWfrpState(p, { channelledSl: undefined })
        ),
        messages: [
            textRef('wfrpMagic.log.channelLost', {
                name,
                lost: held,
                left: 0,
            }),
        ],
    };
}
