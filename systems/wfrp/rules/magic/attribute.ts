import { applyWfrpConditionTo } from '../conditions/apply';
import { isWfrpConditionKey } from '../conditions/catalog';

import { dynamicTextRef } from '@/lib/i18n/text-ref';
import { replaceParticipant } from '@/lib/utils/abilities/engine/core/participants';
import type { SystemConditionResult } from '@/lib/utils/rules/systems/types';
import type { SpellMagic } from '@/lib/utils/spells/model/schema';
import type { BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

export function wfrpLoreAttribute(
    ps: BattleParticipant[],
    targetIds: string[],
    magic: SpellMagic,
    round: number
): SystemConditionResult {
    const attribute = magic.attribute;

    if (!attribute || !isWfrpConditionKey(attribute.condition))
        return { participants: ps, messages: [] };

    let participants = ps;

    const messages: LogLine[] = [];

    for (const id of targetIds) {
        const target = participants.find((p) => p.basicInfo.id === id);

        if (!target) continue;

        const applied = applyWfrpConditionTo(target, {
            key: attribute.condition,
            levels: attribute.levels,
            round,
            sourceName: dynamicTextRef(
                `battleWfrp.conditions.${attribute.condition}.label`
            ),
        });

        participants = replaceParticipant(participants, applied.participant);

        messages.push(...applied.messages);
    }

    return { participants, messages };
}
