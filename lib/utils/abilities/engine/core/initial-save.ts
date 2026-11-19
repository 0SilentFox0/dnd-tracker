import { findParticipant, replaceParticipant } from './participants';
import type { AbilityRunContext } from './types';

import { textRef } from '@/lib/i18n/text-ref';
import { isHostile } from '@/lib/utils/battle/modes/engine';
import { savesOf } from '@/lib/utils/battle/saves/access';
import type { ResolvedAbility } from '@/types/abilities';
import type { BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

export interface InitialSaveResult {
    failed: Set<string>;
    participants: BattleParticipant[];
    messages: LogLine[];
}

/** One save per non-owner target; a target that succeeds is left out of `failed` */
export function rollInitialSaves(
    ability: ResolvedAbility,
    ownerId: string,
    targetIds: string[],
    participants: BattleParticipant[],
    ctx: AbilityRunContext
): InitialSaveResult {
    const failed = new Set<string>();

    const messages: LogLine[] = [];

    let ps = participants;

    const save = ability.save;

    const owner = findParticipant(ps, ownerId);

    if (!save || !owner) return { failed, participants: ps, messages };

    const saves = savesOf(ctx.rules);

    for (const id of new Set(targetIds)) {
        if (id === ownerId) continue;

        const target = findParticipant(ps, id);

        if (!target) continue;

        const roll = saves.roll({
            target,
            ability: save.ability,
            dc: save.dc,
            participants: ps,
            rules: ctx.rules,
            rng: ctx.rng,
            vsSpell: false,
        });

        const resisted = isHostile(ctx.map, owner, target)
            ? saves.resolve(target, roll)
            : { result: roll, participant: target, message: null };

        if (resisted.message) {
            ps = replaceParticipant(ps, resisted.participant);
            messages.push(resisted.message);
        }

        const success = resisted.result.success;

        messages.push(
            textRef('abilityText.log.initialSave', {
                name: ability.name,
                target: target.basicInfo.name,
                ability: save.ability.toUpperCase(),
                total: roll.total,
                dc: save.dc,
                success: String(success),
            })
        );

        if (!success) failed.add(id);
    }

    return { failed, participants: ps, messages };
}
