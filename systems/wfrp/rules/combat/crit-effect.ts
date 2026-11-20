import { applyWfrpConditionTo } from '../conditions/apply';
import type { EditionProfile } from '../edition';
import type { CritResult } from './crit-table';
import { notTodayLine, recordCritWound } from './critical';

import { textRef } from '@/lib/i18n/text-ref';
import { upsertLabeled } from '@/lib/utils/battle/actions/effects';
import { PERMANENT_ROUNDS } from '@/lib/utils/battle/conditions/set';
import type { BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

export function applyWfrpCrit(
    target: BattleParticipant,
    crit: CritResult,
    round: number,
    /** Canon5e counts Critical Wounds and can die from them (p172) */
    edition?: Pick<EditionProfile, 'woundModel' | 'conditionModel'>
): { participant: BattleParticipant; message: LogLine } {
    const counted = edition?.woundModel === 'critical';

    const base =
        counted && crit.death
            ? textRef('battleWfrp.log.critDeath', {
                  target: target.basicInfo.name,
                  text: crit.text,
              })
            : crit.bonusDamage > 0
              ? textRef('battleWfrp.log.critHit', {
                    target: target.basicInfo.name,
                    text: crit.text,
                    bonus: crit.bonusDamage,
                })
              : textRef('battleWfrp.log.critWound', {
                    target: target.basicInfo.name,
                    text: crit.text,
                });

    let participant = target;

    for (const { key, levels } of crit.conditions)
        participant = applyWfrpConditionTo(participant, {
            key,
            levels,
            round,
            edition,
            sourceName: crit.text,
        }).participant;

    for (const marker of crit.markers) {
        participant = upsertLabeled(
            participant,
            {
                timedKey: `wfrp:crit:${crit.id}:${marker}`,
                name: `crit.wfrp.${crit.id}.${marker}`,
                label: crit.text,
                type: 'debuff',
                rounds: PERMANENT_ROUNDS,
                permanent: true,
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
