import { planDrag } from './grapple';

import { textRef } from '@/lib/i18n/text-ref';
import {
    findParticipant,
    replaceParticipant,
} from '@/lib/utils/abilities/engine/core/participants';
import { actionReason } from '@/lib/utils/battle/actions/reasons';
import type {
    MovementInput,
    MovementResult,
} from '@/lib/utils/battle/actions/types';
import { releaseGrapples } from '@/lib/utils/battle/conditions/grapple-links';
import { ruleErrorOf } from '@/lib/utils/battle/store/errors';
import { battleActionToEvent } from '@/lib/utils/battle/store/event-mapping';
import type { NewBattleEvent } from '@/lib/utils/battle/store/types';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { MoveHookResult } from '@/lib/utils/rules/systems/types';
import type { LogLine } from '@/types/text';

function runMoveHooks(input: MovementInput): MoveHookResult | null {
    const { path, mover, rules } = input;

    const start = mover.battleData.position;

    if (!path || !start) return null;

    let out: MoveHookResult | null = null;

    for (const hook of ruleSystemOf(rules).combat.actions.onMove ?? []) {
        const participants = out?.participants ?? input.participants;

        const next = hook({
            ...input,
            path,
            start,
            participants,
            mover: findParticipant(participants, mover.basicInfo.id) ?? mover,
            sceneState: out?.sceneState ?? input.sceneState,
        });

        if (!next) continue;

        out = out
            ? {
                  ...next,
                  sceneState: next.sceneState ?? out.sceneState,
                  actions: [...out.actions, ...next.actions],
                  messages: [...out.messages, ...next.messages],
              }
            : next;

        if (next.stopAt) break;
    }

    return out;
}

export function resolveMovement(input: MovementInput): MovementResult {
    const { map, participants, mover, to, path, budget, cost } = input;

    const messages: LogLine[] = [];

    const events: NewBattleEvent[] = [];

    let base = participants;

    let current = mover;

    let destination = to;

    let spent = cost;

    const opportunity = runMoveHooks(input);

    if (opportunity) {
        base = opportunity.participants;
        current = findParticipant(base, mover.basicInfo.id) ?? mover;
        messages.push(...opportunity.messages);
        events.push(...opportunity.actions.map(battleActionToEvent));

        if (opportunity.stopAt) {
            destination = opportunity.stopAt;
            spent = opportunity.cost;
        }
    }

    const plan = opportunity?.stopAt
        ? null
        : planDrag({ map, participants, mover, to, path });

    for (const id of plan?.blocked ?? []) {
        const out = releaseGrapples(
            base,
            mover.basicInfo.id,
            textRef('battleActions.grapple.reasons.noRoom'),
            id
        );

        base = out.participants;
        messages.push(...out.messages);
    }

    const dragged = plan?.targets ?? [];

    if (dragged.length) {
        spent = cost * 2;

        if (spent > budget)
            throw ruleErrorOf(
                'action_rejected',
                actionReason('dragNoMovement')
            );
    }

    const moved = {
        ...current,
        battleData: {
            ...current.battleData,
            position: destination,
            movementUsed: (mover.battleData.movementUsed ?? 0) + spent,
        },
    };

    let after = replaceParticipant(base, moved);

    for (const { id, cell } of dragged) {
        const t = findParticipant(after, id);

        if (t)
            after = replaceParticipant(after, {
                ...t,
                battleData: { ...t.battleData, position: cell },
            });
    }

    return {
        participants: after,
        moved,
        destination,
        spent,
        messages,
        events,
        sceneState: opportunity?.sceneState ?? input.sceneState,
    };
}
