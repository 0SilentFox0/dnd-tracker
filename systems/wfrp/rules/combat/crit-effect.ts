import { applyWfrpConditionTo } from '../conditions/apply';
import type { EditionProfile } from '../edition';
import type { CritResult } from './crit-table';
import { notTodayLine, recordCritWound } from './critical';
import { sidedMarker, spotOf } from './location';

import { textRef } from '@/lib/i18n/text-ref';
import { upsertLabeled } from '@/lib/utils/battle/actions/effects';
import { PERMANENT_ROUNDS } from '@/lib/utils/battle/conditions/set';
import type { BattleParticipant } from '@/types/battle';
import type { LogLine, TextRef } from '@/types/text';

const SPOT_REF = {
    leftArm: textRef('battleWfrp.ui.fortune.locations.leftArm'),
    rightArm: textRef('battleWfrp.ui.fortune.locations.rightArm'),
    leftLeg: textRef('battleWfrp.ui.fortune.locations.leftLeg'),
    rightLeg: textRef('battleWfrp.ui.fortune.locations.rightLeg'),
} as Record<string, TextRef>;

export function applyWfrpCrit(
    target: BattleParticipant,
    crit: CritResult,
    round: number,
    /** Canon5e counts Critical Wounds and can die from them (p172) */
    edition?: Pick<EditionProfile, 'woundModel' | 'conditionModel'>
): { participant: BattleParticipant; message: LogLine } {
    const counted = edition?.woundModel === 'critical';

    const place = crit.side
        ? SPOT_REF[spotOf(crit.id.split('.')[0], crit.side)]
        : undefined;

    const who = { target: target.basicInfo.name, text: crit.text };

    const base =
        counted && crit.death
            ? place
                ? textRef('battleWfrp.log.critDeathAt', { ...who, place })
                : textRef('battleWfrp.log.critDeath', who)
            : crit.bonusDamage > 0
              ? place
                  ? textRef('battleWfrp.log.critHitAt', {
                        ...who,
                        place,
                        bonus: crit.bonusDamage,
                    })
                  : textRef('battleWfrp.log.critHit', {
                        ...who,
                        bonus: crit.bonusDamage,
                    })
              : place
                ? textRef('battleWfrp.log.critWoundAt', { ...who, place })
                : textRef('battleWfrp.log.critWound', who);

    let participant = target;

    for (const { key, levels } of crit.conditions)
        participant = applyWfrpConditionTo(participant, {
            key,
            levels,
            round,
            edition,
            sourceName: crit.text,
        }).participant;

    for (const key of crit.markers) {
        const timed = crit.markerRounds?.[key];

        const marker = crit.side ? sidedMarker(key, crit.side) : key;

        participant = upsertLabeled(
            participant,
            {
                timedKey: `wfrp:crit:${crit.id}:${marker}`,
                name: `crit.wfrp.${crit.id}.${marker}`,
                label: crit.text,
                type: 'debuff',
                rounds: timed ?? PERMANENT_ROUNDS,
                permanent: timed === undefined,
                stackable: true,
                effects: [{ type: marker, value: 1 }],
            },
            round
        );
    }

    const final = counted
        ? recordCritWound(participant, crit.death)
        : participant;

    return {
        participant: final,
        message: notTodayLine(target, final) ?? base,
    };
}
