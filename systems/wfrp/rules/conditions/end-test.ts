import { skillTarget, value } from '../characteristics/derive';
import { participantChars } from '../combat/participant';
import { resolvePercentileTest } from '../percentile';
import { reduceWfrpCondition } from './apply';
import { isWfrpConditionKey, WFRP_CONDITION_REGISTRY } from './catalog';
import { conditionLevel } from './levels';
import { selfTestMod } from './test-mod';

import { dynamicTextRef, textRef } from '@/lib/i18n/text-ref';
import type { Rng } from '@/lib/utils/common/rng';
import type { Ruleset } from '@/lib/utils/rules';
import type { SystemConditionResult } from '@/lib/utils/rules/systems/types';
import type { BattleParticipant } from '@/types/battle';

export function attemptWfrpConditionEnd(
    ps: BattleParticipant[],
    id: string,
    key: string,
    ctx: { round: number; rng: Rng; rules: Ruleset; presetRoll?: number }
): SystemConditionResult & { success: boolean } {
    const none = { participants: ps, messages: [], success: false };

    const p = ps.find((x) => x.basicInfo.id === id);

    if (!p || !isWfrpConditionKey(key) || conditionLevel(p, key) === 0)
        return none;

    const { endTest } = WFRP_CONDITION_REGISTRY[key];

    if (endTest === null) return none;

    const condition = dynamicTextRef(`battleWfrp.conditions.${key}.label`);

    const replace = (next: BattleParticipant) =>
        ps.map((x) => (x === p ? next : x));

    if (endTest === 'stand') {
        const { participant } = reduceWfrpCondition(p, key, 'all');

        return {
            participants: replace(participant),
            messages: [
                textRef('battleWfrp.log.stand', { name: p.basicInfo.name }),
            ],
            success: true,
        };
    }

    const c = participantChars(p);

    const base =
        'skill' in endTest
            ? (skillTarget(c, endTest.skill)?.target ?? 0)
            : value(c, endTest.characteristic);

    const target = base + selfTestMod(p, 'test');

    const t = resolvePercentileTest({
        target,
        rng: ctx.rng,
        presetRoll: ctx.presetRoll,
    });

    const success = t.outcome === 'success' || t.outcome === 'critical';

    const params = {
        name: p.basicInfo.name,
        condition,
        roll: t.roll,
        target,
        sl: t.sl,
    };

    const participants = success
        ? replace(reduceWfrpCondition(p, key, 1).participant)
        : ps;

    return {
        participants,
        messages: [
            textRef(
                success
                    ? 'battleWfrp.log.endTestSuccess'
                    : 'battleWfrp.log.endTestFail',
                params
            ),
        ],
        success,
    };
}
