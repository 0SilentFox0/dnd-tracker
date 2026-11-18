import { Prisma } from '@prisma/client';

import { persistConsumables } from './persist-consumables';
import { persistIngredients } from './persist-ingredients';
import { persistCharacterResources } from './persist-resources';
import { persistBattleXp } from './persist-xp';

import {
    BATTLE_LOG_TEXT_FALLBACK,
    BATTLE_SNAPSHOTS_KEPT_AFTER_COMPLETE,
    BattleStatus,
} from '@/lib/constants/battle';
import { DEFAULT_LOCALE } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/translator';
import { lockMapRow } from '@/lib/server/battle-maps/library-service';
import { encodeLog } from '@/lib/utils/battle/log/codec';
import { formatBattleLog } from '@/lib/utils/battle/log/lines';
import { persistedMap } from '@/lib/utils/battle/map-storage/persisted-map';
import { applyScenePatch } from '@/lib/utils/battle/scene-state';
import type {
    ParticipantsDiff,
    ParticipantUpdate,
} from '@/lib/utils/battle/store/diff-participants';
import { diffParticipants } from '@/lib/utils/battle/store/diff-participants';
import { BattleConflictError } from '@/lib/utils/battle/store/errors';
import {
    buildSnapshotState,
    isEmptyMapState,
} from '@/lib/utils/battle/store/snapshot-state';
import {
    joinParticipant,
    splitParticipant,
} from '@/lib/utils/battle/store/split-participant';
import type { BattleDb } from '@/lib/utils/battle/store/types';
import type {
    BattleDelta,
    BattleMutationOutcome,
    BattleSceneState,
    BattleWrite,
    LoadedBattle,
    ParticipantColumns,
    StoredBattleEvent,
    StoredParticipant,
} from '@/lib/utils/battle/store/types';
import { toInputJson } from '@/lib/utils/common/json';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapState } from '@/types/battle-grid';
import type { LogLine } from '@/types/text';

type UpdatableColumn = Exclude<keyof ParticipantColumns, 'id'>;

const COLUMN_SQL_TYPES: Record<UpdatableColumn, 'text' | 'int' | 'boolean'> = {
    sourceType: 'text',
    sourceId: 'text',
    side: 'text',
    controlledBy: 'text',
    orderIndex: 'int',
    isPending: 'boolean',
    extraTurnOf: 'text',
    currentHp: 'int',
    tempHp: 'int',
    maxHp: 'int',
    morale: 'int',
    status: 'text',
    initiative: 'int',
    hasUsedAction: 'boolean',
    hasUsedBonusAction: 'boolean',
    hasUsedReaction: 'boolean',
    hasExtraTurn: 'boolean',
};

const UPDATABLE_COLUMNS = Object.keys(COLUMN_SQL_TYPES) as UpdatableColumn[];

const quoted = (name: string) => Prisma.raw(`"${name}"`);

// один UPDATE … FROM (VALUES …) без RETURNING: кількість запитів не росте з кількістю учасників
function updateParticipantsSql(
    battleId: string,
    updates: ParticipantUpdate[]
): Prisma.Sql {
    const rows = updates.map(({ next, snapshotChanged }) => {
        const values = UPDATABLE_COLUMNS.map(
            (c) =>
                Prisma.sql`${next.columns[c]}::${Prisma.raw(COLUMN_SQL_TYPES[c])}`
        );

        return Prisma.sql`(${next.columns.id}, ${Prisma.join(values)}, ${JSON.stringify(next.state)}::jsonb, ${
            snapshotChanged ? JSON.stringify(next.snapshot) : null
        }::jsonb, ${snapshotChanged ? next.snapshotHash : null}::text)`;
    });

    const assignments = UPDATABLE_COLUMNS.map(
        (c) => Prisma.sql`${quoted(c)} = v.${quoted(c)}`
    );

    return Prisma.sql`
    UPDATE battle_participants AS p SET
      ${Prisma.join(assignments)},
      state = v.state,
      snapshot = COALESCE(v.snapshot, p.snapshot),
      "snapshotHash" = COALESCE(v."snapshotHash", p."snapshotHash")
    FROM (VALUES ${Prisma.join(rows)}) AS v(id, ${Prisma.join(UPDATABLE_COLUMNS.map(quoted))}, state, snapshot, "snapshotHash")
    WHERE p.id = v.id AND p."battleId" = ${battleId}
  `;
}

function pruneSnapshotsSql(battleId: string): Prisma.Sql {
    return Prisma.sql`
    DELETE FROM battle_snapshots
    WHERE "battleId" = ${battleId} AND seq < (
      SELECT seq FROM battle_snapshots WHERE "battleId" = ${battleId}
      ORDER BY seq DESC OFFSET ${BATTLE_SNAPSHOTS_KEPT_AFTER_COMPLETE - 1} LIMIT 1
    )
  `;
}

function toStored(
    participants: BattleParticipant[],
    pending: BattleParticipant[]
): StoredParticipant[] {
    return [
        ...participants.map((p, i) =>
            splitParticipant(p, { orderIndex: i, isPending: false })
        ),
        ...pending.map((p, i) =>
            splitParticipant(p, { orderIndex: i, isPending: true })
        ),
    ];
}

function jsonOrNull(
    value: unknown
): Prisma.InputJsonValue | typeof Prisma.DbNull {
    return value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue);
}

async function writeMapState(
    tx: Pick<Prisma.TransactionClient, 'battleMapState'>,
    battleId: string,
    state: BattleMapState | null
) {
    if (!state || isEmptyMapState(state)) {
        await tx.battleMapState.deleteMany({ where: { battleId } });

        return;
    }

    const data = {
        removedEdges: state.removedEdges as Prisma.InputJsonValue,
        doors: toInputJson(state.doors),
        fog: state.fog ? toInputJson(state.fog) : Prisma.DbNull,
    };

    await tx.battleMapState.upsert({
        where: { battleId },
        create: { battleId, ...data, version: 1 },
        update: { ...data, version: { increment: 1 } },
    });
}

export interface PreparedSave {
    beforeStored: StoredParticipant[];
    diff: ParticipantsDiff;
    events: StoredBattleEvent[];
    clearHistory: boolean;
    delta: BattleDelta;
    turnStartedAt: Date | null;
}

export function prepareSave(
    before: LoadedBattle,
    outcome: BattleMutationOutcome,
    logText?: (log: LogLine[]) => string
): PreparedSave {
    const { scene } = before;

    const beforeStored = toStored(before.participants, before.pending);

    const diff = diffParticipants(
        beforeStored,
        toStored(outcome.participants, outcome.pending)
    );

    const clearHistory = Boolean(outcome.history && 'clear' in outcome.history);

    const firstSeq = clearHistory ? 1 : scene.eventSeq + 1;

    const events: StoredBattleEvent[] = outcome.events.map((e, i) => ({
        seq: firstSeq + i,
        type: e.type,
        round: e.round,
        actorId: e.actorId ?? null,
        targets: e.targets ?? [],
        details: e.details ?? {},
        hpChanges: e.hpChanges ?? [],
        resultText: e.resultText,
    }));

    const stored = events.map((e) => {
        const log = (e.details as { log?: LogLine[] }).log;

        if (!log) return e;

        const resultText =
            logText && BATTLE_LOG_TEXT_FALLBACK ? logText(log) : e.resultText;

        return {
            ...e,
            resultText,
            details: { ...e.details, log: encodeLog(log) },
        };
    });

    const nextPatched = applyScenePatch(scene, outcome.scene ?? {});

    const moved =
        nextPatched.round !== scene.round ||
        nextPatched.turnIndex !== scene.turnIndex ||
        nextPatched.status !== scene.status;

    const turnStartedAt = moved ? new Date() : (scene.turnStartedAt ?? null);

    const nextScene: BattleSceneState = { ...nextPatched, turnStartedAt };

    const delta: BattleDelta = {
        battleId: scene.id,
        version: scene.version + 1,
        scene: {
            status: nextScene.status,
            round: nextScene.round,
            turnIndex: nextScene.turnIndex,
            pendingMoraleCheck: nextScene.pendingMoraleCheck,
            pendingChoice: nextScene.pendingChoice,
            turnStartedAt,
            ...(nextScene.sceneState && { sceneState: nextScene.sceneState }),
        },
        upserted: [...diff.created, ...diff.updated.map((u) => u.next)].map(
            (p) => joinParticipant(p, scene.id)
        ),
        fullIds: [
            ...diff.created,
            ...diff.updated.filter((u) => u.snapshotChanged).map((u) => u.next),
        ].map((p) => p.columns.id),
        removed: diff.removed.map((p) => p.columns.id),
        events,
    };

    return {
        beforeStored,
        diff,
        events: stored,
        clearHistory,
        delta,
        turnStartedAt,
    };
}

type SaveScope = {
    before: LoadedBattle;
    outcome: BattleMutationOutcome;
    write: BattleWrite;
} & Pick<
    ReturnType<typeof prepareSave>,
    'beforeStored' | 'diff' | 'events' | 'clearHistory' | 'turnStartedAt'
>;

async function assertPinnedMap(
    tx: Prisma.TransactionClient,
    { outcome }: SaveScope
) {
    const patch = outcome.scene ?? {};

    if (patch.mapRef) {
        const { mapId, version } = patch.mapRef;

        await lockMapRow(tx, mapId, 'share');

        const pinned = await tx.battleMapVersion.findUnique({
            where: { mapId_version: { mapId, version } },
            select: { version: true },
        });

        if (!pinned) throw new BattleConflictError();
    }
}

async function updateScene(tx: Prisma.TransactionClient, s: SaveScope) {
    const { before, outcome, events, clearHistory, turnStartedAt } = s;

    const { scene } = before;

    const patch = outcome.scene ?? {};

    const { count } = await tx.battleScene.updateMany({
        where: { id: scene.id, version: scene.version },
        data: {
            version: { increment: 1 },
            eventSeq: clearHistory
                ? events.length
                : scene.eventSeq + events.length,
            ...(patch.status !== undefined && { status: patch.status }),
            ...(patch.round !== undefined && { currentRound: patch.round }),
            ...(patch.turnIndex !== undefined && {
                currentTurnIndex: patch.turnIndex,
            }),
            ...(patch.pendingMoraleCheck !== undefined && {
                pendingMoraleCheck: jsonOrNull(patch.pendingMoraleCheck),
            }),
            ...(patch.pendingChoice !== undefined && {
                pendingCritChoice: jsonOrNull(patch.pendingChoice),
            }),
            ...(patch.sceneState !== undefined && {
                systemState: patch.sceneState
                    ? toInputJson(patch.sceneState)
                    : Prisma.DbNull,
            }),
            ...(patch.startedAt !== undefined && {
                startedAt: patch.startedAt,
            }),
            ...(turnStartedAt !== (scene.turnStartedAt ?? null) && {
                turnStartedAt,
            }),
            ...(patch.completedAt !== undefined && {
                completedAt: patch.completedAt,
            }),
            ...(patch.map !== undefined && {
                map: jsonOrNull(
                    patch.map &&
                        persistedMap(
                            before.meta,
                            patch.map,
                            patch.mapState === undefined
                                ? before.meta.mapState
                                : patch.mapState
                        )
                ),
            }),
            ...(patch.mapRef && { mapVersion: patch.mapRef.version }),
            ...(patch.rules !== undefined && {
                rules: patch.rules as Prisma.InputJsonValue,
            }),
        },
    });

    if (count === 0) throw new BattleConflictError();
}

async function writeParticipants(
    tx: Prisma.TransactionClient,
    { before, outcome, diff }: SaveScope
) {
    const { scene } = before;

    const patch = outcome.scene ?? {};

    if (
        patch.mapState !== undefined &&
        !(
            isEmptyMapState(before.meta.mapState) &&
            isEmptyMapState(patch.mapState)
        )
    )
        await writeMapState(tx, scene.id, patch.mapState);

    if (diff.created.length > 0) {
        await tx.battleParticipant.createMany({
            data: diff.created.map((p) => ({
                ...p.columns,
                battleId: scene.id,
                snapshot: toInputJson(p.snapshot),
                state: toInputJson(p.state),
                snapshotHash: p.snapshotHash,
            })),
        });
    }

    if (diff.removed.length > 0) {
        await tx.battleParticipant.deleteMany({
            where: {
                battleId: scene.id,
                id: { in: diff.removed.map((p) => p.columns.id) },
            },
        });
    }

    if (diff.updated.length > 0)
        await tx.$executeRaw(updateParticipantsSql(scene.id, diff.updated));
}

async function writeHistory(
    tx: Prisma.TransactionClient,
    { before, outcome, diff, events, clearHistory, beforeStored }: SaveScope
) {
    const { scene } = before;

    const patch = outcome.scene ?? {};

    if (outcome.history && 'cancelFromSeq' in outcome.history) {
        await tx.battleEvent.updateMany({
            where: {
                battleId: scene.id,
                seq: { gte: outcome.history.cancelFromSeq },
                cancelledAt: null,
            },
            data: { cancelledAt: new Date() },
        });
        await tx.battleSnapshot.deleteMany({
            where: {
                battleId: scene.id,
                seq: { gte: outcome.history.cancelFromSeq },
            },
        });
    }

    if (clearHistory) {
        await tx.battleEvent.deleteMany({ where: { battleId: scene.id } });
        await tx.battleSnapshot.deleteMany({
            where: { battleId: scene.id },
        });
    }

    if (events.length > 0) {
        await tx.battleSnapshot.createMany({
            data: [
                {
                    battleId: scene.id,
                    seq: events[0].seq,
                    state: toInputJson(
                        buildSnapshotState(
                            scene,
                            beforeStored,
                            diff,
                            before.meta.map,
                            {
                                mapState: before.meta.mapState,
                                mapRef: before.meta.mapRef,
                                mapStateChanged: patch.mapState !== undefined,
                            }
                        )
                    ),
                },
            ],
        });
        await tx.battleEvent.createMany({
            data: events.map((e) => ({
                ...e,
                battleId: scene.id,
                targets: e.targets as Prisma.InputJsonValue,
                details: e.details as Prisma.InputJsonValue,
                hpChanges: e.hpChanges as Prisma.InputJsonValue,
            })),
        });
    }
}

async function persistCompletion(
    tx: Prisma.TransactionClient,
    { before, outcome, write }: SaveScope
) {
    const { scene } = before;

    await persistCharacterResources(
        tx,
        {
            campaignId: scene.campaignId,
            battleId: scene.id,
            rules: before.meta.rules,
        },
        outcome.participants
    );
    await persistBattleXp(
        tx,
        {
            campaignId: scene.campaignId,
            battleId: scene.id,
            rules: before.meta.rules,
            locale: write.logLocale,
        },
        outcome.participants,
        outcome.events
    );
    await persistConsumables(
        tx,
        { campaignId: scene.campaignId },
        outcome.participants
    );
    await persistIngredients(
        tx,
        { campaignId: scene.campaignId, rules: before.meta.rules },
        outcome.participants
    );
    await tx.$executeRaw(pruneSnapshotsSql(scene.id));
}

export async function saveBattle(
    db: BattleDb,
    before: LoadedBattle,
    outcome: BattleMutationOutcome,
    write: BattleWrite = { logLocale: DEFAULT_LOCALE }
): Promise<BattleDelta> {
    const { scene } = before;

    const patch = outcome.scene ?? {};

    const t = BATTLE_LOG_TEXT_FALLBACK
        ? await getTranslator(write.logLocale)
        : undefined;

    const { delta, ...prepared } = prepareSave(
        before,
        outcome,
        t && ((log) => formatBattleLog(t, { log, resultText: '' }))
    );

    const scope: SaveScope = { before, outcome, write, ...prepared };

    const completing =
        patch.status === BattleStatus.COMPLETED &&
        scene.status !== BattleStatus.COMPLETED;

    await db.$transaction(async (tx) => {
        await assertPinnedMap(tx, scope);
        await updateScene(tx, scope);
        await writeParticipants(tx, scope);
        await writeHistory(tx, scope);

        if (completing) await persistCompletion(tx, scope);
    });

    return delta;
}
