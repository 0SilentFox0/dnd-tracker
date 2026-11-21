import { skillTarget, value } from '../characteristics/derive';
import { participantChars } from '../combat/participant';
import { editionOf } from '../edition';
import { resolvePercentileTest } from '../percentile';
import { wfrpState } from '../state';
import { applyWfrpConditionTo, reduceWfrpCondition } from './apply';
import { isWfrpConditionKey, WFRP_CONDITION_REGISTRY } from './catalog';
import { conditionLevel } from './levels';
import { selfSlMod, selfTestMod } from './test-mod';

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

    const edition = editionOf(ctx.rules);

    const target = base + selfTestMod(p, 'test', edition);

    const t = resolvePercentileTest({
        target,
        slModifier: selfSlMod(p, edition),
        slModel: edition.slModel,
        rng: ctx.rng,
        presetRoll: ctx.presetRoll,
    });

    const hold = key === 'entangled' ? wfrpState(p).entangledStrength : undefined;

    const held =
        hold === undefined
            ? undefined
            : resolvePercentileTest({
                  target: hold,
                  slModel: edition.slModel,
                  rng: ctx.rng,
              });

    const net = held ? t.sl - held.sl : t.sl;

    const success = held
        ? net > 0 || (net === 0 && target > hold!)
        : t.outcome === 'success' || t.outcome === 'critical';

    const params = {
        name: p.basicInfo.name,
        condition,
        roll: t.roll,
        target,
        sl: net,
    };

    const canon = edition.conditionModel === 'sl';

    const cured = success
        ? reduceWfrpCondition(p, key, canon && key !== 'bleeding' ? 1 + Math.max(0, net - 1) : 1)
        : null;

    const fatigue =
        cured?.removed &&
        canon &&
        (key === 'poisoned' ||
            (key === 'stunned' && conditionLevel(p, 'fatigued') === 0))
            ? applyWfrpConditionTo(cured.participant, {
                  key: 'fatigued',
                  round: ctx.round,
                  sourceName: condition,
                  edition,
              })
            : null;

    const participants = cured
        ? replace((fatigue ?? cured).participant)
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
