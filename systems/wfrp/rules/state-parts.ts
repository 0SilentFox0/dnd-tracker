import { fortuneMax } from './characteristics/keys';
import { isFrenzied } from './traits/frenzy';
import { editionOf } from './edition';
import { PARTICIPANT_SLOT } from './slots';
import { wfrpState, withWfrpState } from './state';

import {
    findParticipant,
    replaceParticipant,
} from '@/lib/utils/abilities/engine/core/participants';
import { withAttacksLeft } from '@/lib/utils/battle/attack/attacks-left';
import type {
    PersistPart,
    StoredPart,
    TurnHook,
    TurnStateReset,
    TurnSubjectCtx,
} from '@/lib/utils/rules/systems/types';

/** Fortune: the saved value, else its maximum; Fate: only once spent (absent = the characteristic) */
export const wfrpFromStored: StoredPart = (p, { stored }) => {
    const chars = PARTICIPANT_SLOT.read(p.abilities.system)?.characteristics;

    const fortune = stored.resources?.fortune ?? (chars && fortuneMax(chars));

    const fate = stored.resources?.fate;

    const sin = stored.resources?.sin;

    if (fortune === undefined && sin === undefined && fate === undefined)
        return p;

    return withWfrpState(p, {
        ...(fortune !== undefined && { fortune }),
        ...(fate !== undefined && { fate }),
        ...(sin !== undefined && { sin }),
    });
};

export const wfrpPersist: PersistPart = ({ participant }, acc) => ({
    resources: {
        ...acc.resources,
        fortune: wfrpState(participant).fortune ?? acc.resources.fortune,
        fate: wfrpState(participant).fate ?? acc.resources.fate,
    },
});

export const wfrpResetState: TurnStateReset = (p, scope) => {
    if (scope !== 'turn') return p;

    const {
        conditionTests,
        momentumAttack,
        lastHand,
        moveMode,
        channelledNow,
        lastCast,
        meleeHit,
        aim,
    } = wfrpState(p);

    const cleared =
        aim?.movementUsed ||
        conditionTests ||
        momentumAttack ||
        lastHand ||
        moveMode ||
        channelledNow ||
        lastCast ||
        meleeHit
            ? withWfrpState(p, {
                  conditionTests: undefined,
                  momentumAttack: undefined,
                  lastHand: undefined,
                  moveMode: undefined,
                  channelledNow: undefined,
                  lastCast: undefined,
                  meleeHit: undefined,
                  ...(aim && { aim: { ...aim, movementUsed: 0 } }),
              })
            : p;

    return isFrenzied(cleared) ? withAttacksLeft(cleared, 1) : cleared;
};

/** Same-hand and Charge blocks belong to the owner's turn: they must not leak into off-turn strikes (p164, p167) */
export const wfrpEndTurnState: TurnHook<TurnSubjectCtx> = ({
    participants,
    id,
    rules,
}) => {
    const p = findParticipant(participants, id);

    if (!p || editionOf(rules).momentumModel !== 'participant')
        return { participants, messages: [] };

    const { momentumAttack, lastHand, moveMode, meleeHit } = wfrpState(p);

    if (!momentumAttack && !lastHand && !moveMode && !meleeHit)
        return { participants, messages: [] };

    return {
        participants: replaceParticipant(
            participants,
            withWfrpState(p, {
                momentumAttack: undefined,
                lastHand: undefined,
                moveMode: undefined,
                meleeHit: undefined,
            })
        ),
        messages: [],
    };
};
