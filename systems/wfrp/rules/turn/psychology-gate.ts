import { editionOf } from '../edition';
import { animosityDue } from '../traits/passions';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { findParticipant } from '@/lib/utils/abilities/engine/core/participants';
import { modeBlockedText } from '@/lib/utils/battle/modes/server';
import type { ActGate } from '@/lib/utils/rules/systems/types';

/** Unvented Animosity keeps the turn open: insult, provoke or attack the group first, or the GM releases (p183) */
export const wfrpPsychologyGate: ActGate = (scope, id, { phase }) => {
    const p = findParticipant(scope.participants, id);

    if (
        phase !== 'end' ||
        !p ||
        editionOf(scope.rules).psychologyModel !== 'extended' ||
        animosityDue(scope.participants, p, scope.map).length === 0 ||
        modeBlockedText(scope.map ?? null)
    )
        return null;

    return { code: 'action_rejected', key: API_ERRORS.ANIMOSITY_COMPELLED };
};
