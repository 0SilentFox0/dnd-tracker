import { lairStateData, lairStateOf, resistSpentOf } from './state';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { textRef } from '@/lib/i18n/text-ref';
import { isActive } from '@/lib/utils/abilities/engine/core/participants';
import { actionReason } from '@/lib/utils/battle/actions/reasons';
import { hasCondition } from '@/lib/utils/battle/conditions/query';
import type { LairRules } from '@/lib/utils/rules/systems/types';
import type { BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

const abilities: LairRules['abilities'] = (p) =>
    p.battleData.resolvedAbilities.filter((a) => a.limits?.lair);

const blocker = (
    p: BattleParticipant,
    round: number,
    key: string
): LogLine | null => {
    const lair = lairStateOf(p);

    if (!lair?.active) return textRef(API_ERRORS.LAIR_NOT_ACTIVE);

    if (
        !isActive(p) ||
        hasCondition(p, 'incapacitated') ||
        p.battleData.reserved
    )
        return actionReason('cannotAct');

    if (lair.usedRound === round) return textRef(API_ERRORS.LAIR_USED);

    return lair.usedRound === round - 1 && lair.lastKey === key
        ? textRef(API_ERRORS.LAIR_REPEAT)
        : null;
};

const spend = (
    p: BattleParticipant,
    round: number,
    key: string
): BattleParticipant => {
    const lair = lairStateOf(p);

    return lair
        ? {
              ...p,
              battleData: {
                  ...p.battleData,
                  ...lairStateData(p, { ...lair, usedRound: round, lastKey: key }),
              },
          }
        : p;
};

const toggle = (p: BattleParticipant, active: boolean): BattleParticipant => {
    const lair = lairStateOf(p) ?? {
        active: false,
        baseResistances: p.battleData.legendary?.resistLeft ?? 0,
    };

    const maximum = active
        ? Math.max(lair.baseResistances, p.battleData.lairResistances ?? 0)
        : lair.baseResistances;

    const legendary = p.battleData.legendary ?? {
        actions: 0,
        actionsLeft: 0,
        resistLeft: 0,
    };

    const next: BattleParticipant = {
        ...p,
        battleData: {
            ...p.battleData,
            legendary: {
                ...legendary,
                resistSpent: resistSpentOf(p),
                resistLeft: Math.max(0, maximum - resistSpentOf(p)),
            },
        },
    };

    return {
        ...next,
        battleData: {
            ...next.battleData,
            ...lairStateData(next, { ...lair, active }),
        },
    };
};

export const LAIR_RULES: LairRules = {
    abilities,
    blocker,
    spend,
    toggle,
    present: (p) => !!lairStateOf(p) || abilities(p).length > 0,
    active: (p) => !!lairStateOf(p)?.active,
};
