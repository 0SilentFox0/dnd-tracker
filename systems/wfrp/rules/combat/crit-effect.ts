import { applyWfrpConditionTo } from '../conditions/apply';
import type { CritResult } from './crit-table';

import { textRef } from '@/lib/i18n/text-ref';
import { upsertLabeled } from '@/lib/utils/battle/actions/effects';
import { PERMANENT_ROUNDS } from '@/lib/utils/battle/conditions/set';
import type { BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

export function applyWfrpCrit(
    target: BattleParticipant,
    crit: CritResult,
    round: number
): { participant: BattleParticipant; message: LogLine } {
    const message =
        crit.bonusDamage > 0
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

    return { participant, message };
}
