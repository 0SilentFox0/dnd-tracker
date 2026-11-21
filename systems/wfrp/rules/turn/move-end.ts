import { moveOf } from '../characteristics/derive';
import { engagedFoes, engagementJournal } from '../combat/engagement';
import { withMomentum } from '../combat/momentum';
import { yardsToFeet } from '../combat/movement';
import { participantChars } from '../combat/participant';
import { editionOf } from '../edition';
import { wfrpState, withWfrpState } from '../state';
import { isSwarm } from '../traits/creature';
import { frenzyMoveAllowed, isFrenzied } from '../traits/frenzy';
import { isBiggerThan } from '../traits/size';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { EffectMarker } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import { isAdjacentOnMap } from '@/lib/utils/battle/grid/adjacency';
import { cellFeetOf } from '@/lib/utils/battle/grid/cell-feet';
import { hasEffectMarker } from '@/lib/utils/battle/participant/state';
import { BattleRuleError } from '@/lib/utils/battle/store';
import type {
    MoveEndCtx,
    TurnHookResult,
} from '@/lib/utils/rules/systems/types';

/** A Frenzied fighter only closes in on its nearest foe (p184); engaged fighters cannot leave melee without Disengage (p163), a Swarm excepted (p357); a Charge earns Momentum from the distance actually moved (p163) */
function moveEndChecks(ctx: MoveEndCtx): TurnHookResult {
    const { mover, start, map, participants, cost, rules } = ctx;

    const edition = editionOf(rules);

    const out = { participants, messages: [] };

    if (
        edition.psychologyModel === 'extended' &&
        isFrenzied(mover) &&
        !frenzyMoveAllowed(participants, mover, start, map)
    )
        throw new BattleRuleError(
            'action_rejected',
            API_ERRORS.FRENZY_MOVE_TOWARD
        );

    if (edition.momentumModel !== 'participant') return out;

    const before = start
        ? {
              ...mover,
              battleData: { ...mover.battleData, position: start },
          }
        : null;

    const journal = engagementJournal(rules);

    const foes = (
        before && !(edition.traitModel === 'canon' && isSwarm(mover))
            ? engagedFoes(before, participants, map, journal)
            : []
    ).filter(
        (f) => edition.sizeModel !== 'canon' || !isBiggerThan(mover, f)
    );

    if (
        foes.length > 0 &&
        wfrpState(mover).moveMode !== 'flee' &&
        !hasEffectMarker(mover, EffectMarker.DISENGAGED) &&
        !foes.some((f) => isAdjacentOnMap(map, f, mover))
    )
        throw new BattleRuleError(
            'action_rejected',
            API_ERRORS.DISENGAGE_REQUIRED
        );

    const first = (mover.battleData.movementUsed ?? 0) === cost;

    if (wfrpState(mover).moveMode !== 'charge' || !first) return out;

    const target = engagedFoes(mover, participants, map)[0];

    const feet = cost * cellFeetOf(rules);

    if (!target || feet < yardsToFeet(moveOf(participantChars(mover))))
        return out;

    const charged = withMomentum(mover, true);

    if (charged === mover) return out;

    return {
        participants: participants.map((p) =>
            p.basicInfo.id === mover.basicInfo.id ? charged : p
        ),
        messages: [
            textRef('battleWfrp.log.chargeMomentum', {
                name: mover.basicInfo.name,
                target: target.basicInfo.name,
                yards: Math.round(feet / yardsToFeet(1)),
            }),
        ],
    };
}

/** Moving loses the Aim bonus (p165) */
export function wfrpOnMoveEnd(ctx: MoveEndCtx): TurnHookResult {
    const out = moveEndChecks(ctx);

    if (
        editionOf(ctx.rules).actionsModel !== 'canon' ||
        !wfrpState(ctx.mover).aim
    )
        return out;

    return {
        ...out,
        participants: out.participants.map((p) =>
            p.basicInfo.id === ctx.mover.basicInfo.id
                ? withWfrpState(p, { aim: undefined })
                : p
        ),
    };
}
