import { bonus, skillTarget, value } from '../characteristics/derive';
import { participantChars } from '../combat/participant';
import { selfSlMod, selfTestMod } from '../conditions/test-mod';
import { editionOf } from '../edition';
import { resolvePercentileTest } from '../percentile';
import { wfrpState, withWfrpState } from '../state';
import { CHANNEL_LOSS_DIE, CHANNEL_MAX_SL, WORST_ROLL } from './constants';

import { textRef } from '@/lib/i18n/text-ref';
import { rollDie } from '@/lib/utils/common/dice';
import type { Rng } from '@/lib/utils/common/rng';
import type { Ruleset } from '@/lib/utils/rules';
import type { BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

export function channelTargetOf(
    p: BattleParticipant,
    rules?: Ruleset
): number {
    const chars = participantChars(p);

    return (
        (skillTarget(chars, 'channelling')?.target ?? value(chars, 'wp')) +
        selfTestMod(p, 'test', editionOf(rules))
    );
}

export function wfrpChannel(
    p: BattleParticipant,
    ctx: { rules: Ruleset; rng: Rng; presetRoll?: number }
): {
    participant: BattleParticipant;
    lines: LogLine[];
    miscast: 'minor' | 'major' | null;
} {
    const target = channelTargetOf(p, ctx.rules);

    const canon = editionOf(ctx.rules).magicModel === 'canon5e';

    const test = resolvePercentileTest({
        target,
        slModifier: selfSlMod(p, editionOf(ctx.rules)),
        slModel: editionOf(ctx.rules).slModel,
        doubles: canon,
        rng: ctx.rng,
        presetRoll: ctx.presetRoll,
    });

    const success = test.outcome === 'success' || test.outcome === 'critical';

    if (canon) return canonChannel(p, test, success, ctx);

    const miscast = test.roll === WORST_ROLL ? 'minor' : null;

    const held = wfrpState(p).channelledSl ?? 0;

    const banked = success
        ? Math.min(CHANNEL_MAX_SL, held + Math.max(0, test.sl))
        : held;

    const participant = success
        ? withWfrpState(p, { channelledSl: banked })
        : p;

    const line = textRef(
        success ? 'wfrpMagic.log.channelSuccess' : 'wfrpMagic.log.channelFail',
        {
            name: p.basicInfo.name,
            roll: test.roll,
            target: test.target,
            sl: test.sl,
            banked,
        }
    );

    return { participant, lines: [line], miscast };
}

function canonChannel(
    p: BattleParticipant,
    test: ReturnType<typeof resolvePercentileTest>,
    success: boolean,
    ctx: { rules: Ruleset; rng: Rng }
) {
    const held = wfrpState(p).channelledSl ?? 0;

    const params = {
        name: p.basicInfo.name,
        roll: test.roll,
        target: test.target,
        sl: test.sl,
    };

    if (success) {
        const extra =
            test.outcome === 'critical'
                ? bonus(participantChars(p), 'wp')
                : 0;

        const banked = held + Math.max(0, test.sl) + extra;

        return {
            participant: withWfrpState(p, {
                channelledSl: banked,
                channelledNow: true,
            }),
            lines: [
                textRef(
                    extra > 0
                        ? 'wfrpMagic.log.channelCritical'
                        : 'wfrpMagic.log.channelSuccess',
                    { ...params, banked, bonus: extra }
                ),
            ],
            miscast: null,
        };
    }

    const lines: LogLine[] = [textRef('wfrpMagic.log.channelFail', params)];

    if (test.outcome !== 'fumble')
        return {
            participant: withWfrpState(p, { channelledNow: true }),
            lines,
            miscast: null,
        };

    const lost = Math.min(held, rollDie(CHANNEL_LOSS_DIE, ctx.rng));

    const left = held - lost;

    lines.push(
        textRef('wfrpMagic.log.channelLost', {
            name: p.basicInfo.name,
            lost,
            left,
        })
    );

    return {
        participant: withWfrpState(p, {
            channelledSl: left || undefined,
            channelledNow: true,
            miscastSl: lost || undefined,
        }),
        lines,
        miscast: wfrpState(p).malignant ? ('major' as const) : ('minor' as const),
    };
}
