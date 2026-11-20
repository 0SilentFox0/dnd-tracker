import { skillTarget, value } from '../characteristics/derive';
import { participantChars } from '../combat/participant';
import { selfSlMod, selfTestMod } from '../conditions/test-mod';
import { editionOf } from '../edition';
import { resolvePercentileTest } from '../percentile';
import { wfrpState, withWfrpState } from '../state';
import { CHANNEL_MAX_SL, WORST_ROLL } from './constants';

import { textRef } from '@/lib/i18n/text-ref';
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

    const test = resolvePercentileTest({
        target,
        slModifier: selfSlMod(p, editionOf(ctx.rules)),
        slModel: editionOf(ctx.rules).slModel,
        rng: ctx.rng,
        presetRoll: ctx.presetRoll,
    });

    const success = test.outcome === 'success' || test.outcome === 'critical';

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
