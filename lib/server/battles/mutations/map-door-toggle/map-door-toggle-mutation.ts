import { API_ERRORS } from '@/lib/constants/api-errors';
import { textRef } from '@/lib/i18n/text-ref';
import {
    findParticipant,
    isActive,
} from '@/lib/utils/abilities/engine/core/participants';
import { canActNow, currentOf } from '@/lib/utils/battle/common/control';
import { cellKey, cellsOf } from '@/lib/utils/battle/grid';
import { parseEdgeKey } from '@/lib/utils/battle/grid/walls';
import { baseDoorsOf } from '@/lib/utils/battle/map-storage/effective-map';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { BattleAccessError, BattleRuleError } from '@/lib/utils/battle/store';
import { actorEvent, dmEvent } from '@/lib/utils/battle/store/event-mapping';
import { REJECT } from '@/lib/utils/battle/store/reject';
import { assertCanAct } from '@/lib/utils/battle/turn';
import type { MapDoorToggleData } from '@/types/api';
import type { BattleParticipant, DoorState } from '@/types/battle';

const sameDoor = (a: DoorState | undefined, b: DoorState | undefined) =>
    !!a && !!b && a.open === b.open && !!a.locked === !!b.locked;

function reject(message: string): never {
    throw new BattleRuleError('action_rejected', message);
}

function playerActor(
    ctx: BattleMutationContext,
    body: MapDoorToggleData,
    door: DoorState
): BattleParticipant {
    if (body.locked !== undefined) reject(REJECT.doorDmOnly);

    const actor = body.actorId
        ? findParticipant(ctx.participants, body.actorId)
        : undefined;

    if (!actor)
        throw new BattleAccessError(
            404,
            API_ERRORS.BATTLE_PARTICIPANT_NOT_IN_BATTLE
        );

    if (!canActNow(ctx, actor, currentOf(ctx)))
        throw new BattleAccessError(403, API_ERRORS.FORBIDDEN);

    if (!isActive(actor)) reject(REJECT.cannotAct);

    assertCanAct(ctx, actor.basicInfo.id);

    const { a, b } = parseEdgeKey(body.edge);

    const near = new Set(cellsOf(actor).map(cellKey));

    if (!near.has(cellKey(a)) && !near.has(cellKey(b)))
        reject(REJECT.doorNotAdjacent);

    if (door.locked) reject(REJECT.doorLocked);

    return actor;
}

function nextDoor(door: DoorState, body: MapDoorToggleData): DoorState {
    const open = body.open ?? door.open;

    const locked = body.locked ?? (open ? false : !!door.locked);

    if (open && locked) reject(REJECT.doorOpenLock);

    return { open, ...(locked && { locked }) };
}

function logText(
    next: DoorState,
    door: DoorState,
    actor: BattleParticipant | undefined
) {
    if (actor)
        return textRef(
            next.open ? 'battleLog.door.opened' : 'battleLog.door.closed',
            {
                name: actor.basicInfo.name,
            }
        );

    if (!!next.locked !== !!door.locked)
        return textRef(
            next.locked
                ? 'battleLog.dm.doorLocked'
                : 'battleLog.dm.doorUnlocked'
        );

    return textRef(
        next.open ? 'battleLog.dm.doorOpened' : 'battleLog.dm.doorClosed'
    );
}

export function mapDoorToggleMutation(
    ctx: BattleMutationContext,
    body: MapDoorToggleData
): MutationResult {
    const map = ctx.meta.map;

    if (!map)
        throw new BattleRuleError('action_rejected', API_ERRORS.BATTLE_NO_MAP);

    const door = map.doors?.[body.edge];

    if (!door) reject(REJECT.doorNotFound);

    const actor = ctx.isDM ? undefined : playerActor(ctx, body, door);

    const next = nextDoor(door, body);

    const unchanged: MutationResult = {
        participants: ctx.participants,
        pending: ctx.pending,
        events: [],
    };

    if (sameDoor(next, door)) return unchanged;

    const state = ctx.meta.mapState ?? { removedEdges: [], doors: {} };

    const doors = { ...state.doors };

    if (sameDoor(next, baseDoorsOf(map.doors)?.[body.edge]))
        delete doors[body.edge];
    else doors[body.edge] = next;

    const text = logText(next, door, actor);

    return {
        ...unchanged,
        events: [
            actor
                ? actorEvent(ctx.scene.round, actor, text)
                : dmEvent(ctx.scene.round, text),
        ],
        scene: { mapState: { ...state, doors } },
    };
}
