import {
    attackShare,
    isEnemyOf,
    maneuverResult,
    pickedEnemies,
    strikeAll,
} from './strike';
import type { ManeuverInput, ManeuverResult } from './types';

import { textRef } from '@/lib/i18n/text-ref';
import {
    findParticipant,
    replaceParticipant,
} from '@/lib/utils/abilities/engine/core/participants';
import { cellsOf, footprintDistance, isOnMap } from '@/lib/utils/battle/grid';
import { savesOf } from '@/lib/utils/battle/saves/access';
import { spellSaveDc } from '@/lib/utils/battle/spell/save-dc';
import type { BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

export function fireBurst(
    ps: BattleParticipant[],
    input: ManeuverInput
): ManeuverResult {
    const actor = findParticipant(ps, input.actorId);

    if (!actor) return maneuverResult(ps);

    const targets =
        input.map && isOnMap(actor)
            ? ps.filter(
                  (p) =>
                      isEnemyOf(actor, input.map)(p) &&
                      isOnMap(p) &&
                      footprintDistance(cellsOf(actor), cellsOf(p)) <= 1
              )
            : pickedEnemies(
                  ps,
                  actor,
                  input.targetIds,
                  input.maxTargets ?? input.targetIds.length,
                  input.map
              );

    if (!targets.length)
        return {
            ...maneuverResult(ps),
            messages: [
                textRef('battleLog.maneuver.fireNobody', {
                    ability: input.name,
                    name: actor.basicInfo.name,
                }),
            ],
        };

    const full = attackShare(
        actor,
        ps,
        input.percentOfAttack,
        input.rng,
        input.rules
    );

    const dc = spellSaveDc(input.rules, actor);

    const notes = new Map<string, LogLine>();

    let next = ps;

    const resisted: LogLine[] = [];

    const saves = savesOf(input.rules);

    const hits = targets.map((t) => {
        const rolled = saves.roll({
            target: t,
            ability: 'dexterity',
            dc,
            participants: ps,
            rules: input.rules,
            rng: input.rng,
        });

        const { result, participant, message } = saves.resolve(t, rolled);

        if (message) {
            next = replaceParticipant(next, participant);
            resisted.push(message);
        }

        const evasive = saves.evasion.has(ps, t);

        notes.set(
            t.basicInfo.id,
            textRef('battleLog.maneuver.fireNote', {
                total: rolled.total,
                dc,
                detail: evasive
                    ? textRef(
                          result.success
                              ? 'battleLog.maneuver.evaded'
                              : 'battleLog.maneuver.evadedHalf'
                      )
                    : result.success
                      ? textRef('battleLog.maneuver.half')
                      : '',
            })
        );

        return {
            targetId: t.basicInfo.id,
            amount: Math.floor(
                full * saves.evasion.factor(result.success, evasive)
            ),
        };
    });

    return strikeAll(maneuverResult(next, resisted), hits, {
        actorId: actor.basicInfo.id,
        damageType: 'fire',
        name: input.name,
        rules: input.rules,
        rng: input.rng,
        note: (id) => notes.get(id) ?? '',
    });
}
