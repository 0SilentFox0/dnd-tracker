import { skillTarget, value } from '../characteristics/derive';
import { participantChars } from '../combat/participant';
import { selfTestMod } from '../conditions/test-mod';
import { resolvePercentileTest } from '../percentile';
import { wfrpState, withWfrpState } from '../state';
import { CHANNEL_MAX_SL, WORST_ROLL } from './constants';

import { textRef } from '@/lib/i18n/text-ref';
import type { Rng } from '@/lib/utils/common/rng';
import type { Ruleset } from '@/lib/utils/rules';
import type { BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

export function channelTargetOf(p: BattleParticipant): number {
    const chars = participantChars(p);

    return (
        (skillTarget(chars, 'channelling')?.target ?? value(chars, 'wp')) +
        selfTestMod(p, 'test')
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
    const target = channelTargetOf(p);

    const test = resolvePercentileTest({
        target,
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
