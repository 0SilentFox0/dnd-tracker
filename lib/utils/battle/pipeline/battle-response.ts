import { PUSHER_DELTA_LIMIT_BYTES } from './limits';
import { publicPending } from './public-pending';

import { BattleStatus } from '@/lib/constants/battle';
import { CampaignRole } from '@/lib/constants/campaigns';
import { CONTROLLED_BY_DM } from '@/lib/constants/characters';
import {
    battleChannelName,
    battleDmChannelName,
    userChannelName,
} from '@/lib/pusher/channels';
import { clientMapOf } from '@/lib/utils/battle/map-storage/persisted-map';
import { publicSetup, reserveOf } from '@/lib/utils/battle/participant/reserve';
import type { BattleSceneState, LoadedBattle } from '@/lib/utils/battle/store';
import { checkVictoryConditions } from '@/lib/utils/battle/turn/victory';
import {
    redactParticipantsForViewer,
    redactPatchesForViewer,
    redactPendingForViewer,
} from '@/lib/utils/battle/view/redact-participants';
import {
    alwaysSeesEnemyStats,
    PLAYER_VIEWER,
    redactLogForPlayers,
    type Viewer,
} from '@/lib/utils/battle/view/visibility';
import { stripPlayerHiddenRules } from '@/lib/utils/rules/player-hidden';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type {
    BattleRefetchSignal,
    BattleScene,
    ClientBattleDelta,
} from '@/types/api';
import type { BattleParticipant } from '@/types/battle';
import type { BattleAction } from '@/types/battle-actions';

export interface BattleResponseView {
    isDM?: boolean;
    userId?: string;
}

export function viewerOf(
    view: BattleResponseView,
    participants: BattleParticipant[]
): Viewer {
    const { userId = null } = view;

    return {
        userId,
        isDM: Boolean(view.isDM),
        readOnly: true,
        canSeeEnemyHp:
            userId !== null && alwaysSeesEnemyStats(participants, userId),
    };
}

export interface PusherMessage {
    channel: string;
    event: string;
    payload: unknown;
}

function mapFields(meta: LoadedBattle['meta']) {
    const { mapRef, mapState } = meta;

    return {
        map: clientMapOf(meta),
        ...(mapRef && { mapRef }),
        ...(mapState && { mapState }),
    };
}

export function toBattleResponse(
    loaded: Pick<LoadedBattle, 'meta'>,
    scene: BattleSceneState,
    participants: BattleParticipant[],
    pending: BattleParticipant[],
    log: {
        mode: 'append' | 'full';
        entries: BattleAction[];
        cancelledFrom?: number;
    },
    view?: BattleResponseView
): BattleScene {
    const { meta } = loaded;

    const hide = view && !view.isDM;

    const viewer = view && viewerOf(view, participants);

    return {
        id: scene.id,
        campaignId: scene.campaignId,
        name: meta.name,
        description: meta.description ?? undefined,
        status: scene.status,
        participants:
            scene.status === BattleStatus.PREPARED
                ? hide
                    ? publicSetup(meta.setup)
                    : meta.setup
                : [],
        currentRound: scene.round,
        currentTurnIndex: scene.turnIndex,
        initiativeOrder: viewer
            ? redactParticipantsForViewer(viewer, participants, meta.rules)
            : participants,
        ...(viewer &&
            !viewer.isDM &&
            !viewer.canSeeEnemyHp && { redacted: true as const }),
        pendingSummons: viewer ? redactPendingForViewer(viewer, pending, meta.rules) : pending,
        pendingChoice: publicPending(scene.pendingChoice),
        ...(scene.sceneState && { system: scene.sceneState }),
        ...mapFields(meta),
        audio: meta.audio ?? null,
        rules: hide ? stripPlayerHiddenRules(meta.rules) : meta.rules,
        turnTimerSeconds: meta.turnTimerSeconds ?? null,
        battleLog: log.entries,
        ...(log.mode === 'append' && { battleLogMode: 'append' as const }),
        ...(log.cancelledFrom !== undefined && {
            battleLogCancelledFrom: log.cancelledFrom,
        }),
        version: scene.version,
        createdAt: meta.createdAt.toISOString(),
        startedAt: scene.startedAt?.toISOString(),
        turnStartedAt: scene.turnStartedAt?.toISOString(),
        completedAt: scene.completedAt?.toISOString(),
        campaign: { id: scene.campaignId, friendlyFire: meta.friendlyFire },
        ...(view && {
            isDM: Boolean(view.isDM),
            userRole: view.isDM ? CampaignRole.DM : CampaignRole.PLAYER,
        }),
    };
}

export function redactDeltaForPlayers(
    delta: ClientBattleDelta,
    participants: BattleParticipant[],
    rules: Ruleset,
    viewer: Viewer = PLAYER_VIEWER
): { delta: ClientBattleDelta; changed: boolean } {
    const { entries, changed: logChanged } = redactLogForPlayers(delta.log, {
        participants,
        rules,
    });

    const upserted = redactParticipantsForViewer(viewer, delta.upserted, rules);

    const patched =
        delta.patched &&
        redactPatchesForViewer(viewer, delta.patched, participants, rules);

    const pending =
        delta.pending && redactPendingForViewer(viewer, delta.pending, rules);

    const setup = delta.setup && publicSetup(delta.setup);

    const changed =
        logChanged ||
        upserted !== delta.upserted ||
        patched !== delta.patched ||
        pending !== delta.pending ||
        setup !== delta.setup;

    return {
        delta: changed
            ? {
                  ...delta,
                  log: entries,
                  upserted,
                  ...(patched && { patched }),
                  ...(pending && { pending }),
                  ...(setup && { setup }),
              }
            : delta,
        changed,
    };
}

function fitOrRefetch(
    delta: ClientBattleDelta
): ClientBattleDelta | BattleRefetchSignal {
    const fits =
        Buffer.byteLength(JSON.stringify(delta), 'utf8') <=
        PUSHER_DELTA_LIMIT_BYTES;

    return fits
        ? delta
        : {
              battleId: delta.battleId,
              version: delta.version,
              refetch: true,
              ...(delta.redacted && { redacted: true as const }),
          };
}

export function buildPusherMessages(args: {
    before: BattleSceneState;
    after: BattleSceneState;
    participants: BattleParticipant[];
    rules: Ruleset;
    pending?: BattleParticipant[];
    wasAwaiting?: boolean;
    delta: ClientBattleDelta;
}): PusherMessage[] {
    const {
        before,
        after,
        participants,
        rules,
        pending = [],
        wasAwaiting = false,
        delta,
    } = args;

    const channel = battleChannelName(after.id);

    const { delta: redactedDelta, changed } = redactDeltaForPlayers(
        delta,
        participants,
        rules
    );

    const publicDelta: ClientBattleDelta = changed
        ? { ...redactedDelta, redacted: true }
        : delta;

    const messages: PusherMessage[] = [
        { channel, event: 'battle-delta', payload: fitOrRefetch(publicDelta) },
    ];

    if (changed)
        messages.push({
            channel: battleDmChannelName(after.id),
            event: 'battle-delta',
            payload: fitOrRefetch(delta),
        });

    const turnMoved =
        before.round !== after.round ||
        before.turnIndex !== after.turnIndex ||
        before.status !== after.status ||
        wasAwaiting;

    const active = participants[after.turnIndex];

    const awaiting =
        checkVictoryConditions(participants, reserveOf(pending), rules)
            .awaiting !== null;

    if (
        after.status === BattleStatus.ACTIVE &&
        !awaiting &&
        turnMoved &&
        active &&
        active.basicInfo.controlledBy !== CONTROLLED_BY_DM
    ) {
        messages.push({
            channel: userChannelName(active.basicInfo.controlledBy),
            event: 'turn-started',
            payload: {
                battleId: after.id,
                participantId: active.basicInfo.id,
                participantName: active.basicInfo.name,
            },
        });
    }

    return messages;
}
