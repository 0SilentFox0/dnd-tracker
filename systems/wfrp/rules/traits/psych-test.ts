import { skillTarget, value } from '../characteristics/derive';
import { participantChars } from '../combat/participant';
import { selfSlMod, selfTestMod } from '../conditions/test-mod';
import type { EditionProfile } from '../edition';
import { resolvePercentileTest } from '../percentile';

import type { Rng } from '@/lib/utils/common/rng';
import type { BattleParticipant } from '@/types/battle';

export const coolTarget = (p: BattleParticipant): number => {
    const c = participantChars(p);

    return skillTarget(c, 'cool')?.target ?? value(c, 'wp');
};

export const willTarget = (p: BattleParticipant): number =>
    value(participantChars(p), 'wp');

export const isSuccess = (outcome: string): boolean =>
    outcome === 'success' || outcome === 'critical';

/** A canon test of the participant's own characteristic: conditions shift the target and the SL */
export function selfTest(
    p: BattleParticipant,
    edition: EditionProfile,
    rng: Rng,
    base: number = coolTarget(p)
) {
    const target = base + selfTestMod(p, 'test', edition);

    const t = resolvePercentileTest({
        target,
        rng,
        slModel: edition.slModel,
        slModifier: selfSlMod(p, edition),
    });

    return { t, target, passed: isSuccess(t.outcome) };
}
