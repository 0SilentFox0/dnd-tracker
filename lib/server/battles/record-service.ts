import { after } from 'next/server';
import { type BattleScene, Prisma } from '@prisma/client';
import { z } from 'zod';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { MAP_LIMITS } from '@/lib/constants/map-limits';
import { prisma } from '@/lib/db';
import { BATTLE_AUDIO_EVENT, battleChannelName } from '@/lib/pusher/channels';
import { safePusherTrigger } from '@/lib/pusher/safe-trigger';
import { pusherServer } from '@/lib/pusher/server';
import {
    battleMapSchema,
    createBattleSchema,
    turnTimerSecondsSchema,
} from '@/lib/schemas';
import { battleAudioCommandSchema } from '@/lib/schemas/music';
import { storedRecord } from '@/lib/schemas/stored-json';
import type { ActionExecutionContext } from '@/lib/server/assistant/types';
import { loadAudioLibrary } from '@/lib/server/audio/track-store';
import { campaignMapMaxSide } from '@/lib/server/battle-maps/campaign-limits';
import {
    getMap,
    getMapMeta,
    lockMapRow,
} from '@/lib/server/battle-maps/library-service';
import {
    assertParticipantSources,
    sourceIdsOf,
} from '@/lib/server/battles/participant-sources';
import { ContentError, parseInput } from '@/lib/server/content/errors';
import { afterContentCommit } from '@/lib/server/content/write-context';
import { clearShowBattle } from '@/lib/server/show/show-store';
import { resolveMapBackgroundForPersistence } from '@/lib/supabase/battle-map-storage';
import {
    BATTLE_RATE_LIMITS,
    checkRateLimit,
    type RateLimitResult,
} from '@/lib/utils/api/rate-limit';
import {
    applyAudioCommand,
    commandNeedsLibrary,
} from '@/lib/utils/audio/audio-command';
import {
    mergeLibraryHeader,
    pruneOutOfBounds,
} from '@/lib/utils/battle/map-storage/merge-header';
import { withoutEdges } from '@/lib/utils/battle/map-storage/persisted-map';
import {
    headerForOtherMap,
    materializeEdges,
} from '@/lib/utils/battle/map-storage/relink-scene';
import { toInputJson } from '@/lib/utils/common/json';
import type { BattleAudioState } from '@/types/audio';
import type { BattleMapConfig } from '@/types/battle-grid';

export class BattleAudioRateLimitError extends ContentError {
    constructor(readonly rate: RateLimitResult) {
        super(API_ERRORS.TOO_MANY_REQUESTS, 429);
    }
}

export const patchBattleSchema = z
    .object({
        name: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        participants: createBattleSchema.shape.participants.optional(),
        map: battleMapSchema.nullable().optional(),
        mapId: z.string().min(1).nullable().optional(),
        turnTimerSeconds: turnTimerSecondsSchema.nullable().optional(),
    })
    .strict()
    .refine((d) => !(d.map && d.mapId), {
        message: 'battleSetup.validation.mapAndMapId',
        path: ['mapId'],
    });
export const recordSchemas = {
    create: createBattleSchema,
    patch: patchBattleSchema,
    delete: z.object({}).strict(),
    'clear-history': z.object({}).strict(),
    audio: battleAudioCommandSchema,
};
export type RecordOperation = keyof typeof recordSchemas;

export function requireBattleId(id: string | undefined): string {
    if (!id) throw new ContentError(API_ERRORS.BATTLE_ID_REQUIRED, 400);

    return id;
}

export async function battleRecord(
    campaignId: string,
    battleId: string
): Promise<BattleScene>;
export async function battleRecord<S extends Prisma.BattleSceneSelect>(
    campaignId: string,
    battleId: string,
    select: S
): Promise<Prisma.BattleSceneGetPayload<{ select: S }>>;
export async function battleRecord(
    campaignId: string,
    battleId: string,
    select?: Prisma.BattleSceneSelect
): Promise<unknown> {
    const row = await prisma.battleScene.findUnique({
        where: { id: battleId },
        ...(select && { select: { ...select, campaignId: true } }),
    });

    if (!row || row.campaignId !== campaignId)
        throw new ContentError(API_ERRORS.BATTLE_NOT_FOUND, 404);

    return row;
}

async function mapForWrite(
    map: z.infer<typeof battleMapSchema> | null | undefined,
    campaignId: string,
    current?: Prisma.JsonValue
) {
    if (!map) return map;

    const previous =
        current &&
        typeof current === 'object' &&
        !Array.isArray(current) &&
        typeof current.background === 'string'
            ? current.background
            : null;

    const bg = await resolveMapBackgroundForPersistence(map.background, {
        campaignId,
        current: previous,
    });

    if (!bg.ok) throw new ContentError(bg.message, 400);

    return { ...map, background: bg.background ?? null };
}

type LinkedMapDb = Parameters<typeof getMapMeta>[1] &
    Parameters<typeof campaignMapMaxSide>[1];

async function linkedMapFor(
    db: LinkedMapDb,
    campaignId: string,
    mapId: string
) {
    const meta = await getMapMeta(mapId, db);

    if (!meta || meta.campaignId !== campaignId)
        throw new ContentError(API_ERRORS.BATTLE_MAP_NOT_FOUND, 404);

    if (
        Math.max(meta.cols, meta.rows) >
        (await campaignMapMaxSide(campaignId, db))
    )
        throw new ContentError(API_ERRORS.BATTLE_MAP_TOO_LARGE, 422);

    return {
        mapId,
        version: meta.version,
        header: toInputJson(meta.header),
    };
}

type PinnedMap = BattleMapConfig | null;

/** The new map columns for a PATCH that rebinds, re-pins or unlinks the library map of a prepared battle. */
async function relinkData(
    db: LinkedMapDb,
    campaignId: string,
    row: BattleScene,
    pinned: PinnedMap,
    mapId: string | null
) {
    if (mapId === null) {
        if (!row.mapId) return null;

        const lib = await getMap(row.mapId, row.mapVersion ?? undefined);

        if (!lib) throw new ContentError(API_ERRORS.BATTLE_MAP_NOT_FOUND, 404);

        if (Math.max(lib.cols, lib.rows) > MAP_LIMITS.photoMaxSide)
            throw new ContentError(API_ERRORS.BATTLE_MAP_TOO_LARGE, 422);

        const inline = materializeEdges(
            pinned ?? (lib.map as BattleMapConfig),
            lib
        );

        if (!inline)
            throw new ContentError(API_ERRORS.BATTLE_MAP_TOO_MANY_EDGES, 422);

        return {
            map: toInputJson(inline),
            mapId: null,
            mapVersion: null,
        };
    }

    const linked = await linkedMapFor(db, campaignId, mapId);

    const library = storedRecord<BattleMapConfig>().parse(linked.header);

    let header = headerForOtherMap(pinned, library);

    if (row.mapId === mapId && pinned) {
        const old =
            row.mapVersion === linked.version
                ? library
                : ((await getMap(mapId, row.mapVersion ?? undefined))?.map as
                      | BattleMapConfig
                      | undefined);

        header = pruneOutOfBounds(
            mergeLibraryHeader(old ?? withoutEdges(pinned), library, pinned)
        );
    }

    return {
        map: toInputJson(header),
        mapId,
        mapVersion: linked.version,
    };
}

/** HTTP uploads keep their established lifecycle outside the database lock. */
export async function prepareHttpBattleRecord(
    campaignId: string,
    operation: RecordOperation,
    battleId: string | undefined,
    raw: unknown
): Promise<unknown> {
    const data = parseInput(
        recordSchemas[operation] as z.ZodType,
        raw
    ) as Record<string, unknown>;

    if ((operation !== 'create' && operation !== 'patch') || !data.map)
        return data;

    const row =
        operation === 'patch'
            ? await battleRecord(campaignId, requireBattleId(battleId))
            : null;

    return {
        ...data,
        map: await mapForWrite(
            data.map as z.infer<typeof battleMapSchema>,
            campaignId,
            row?.map
        ),
    };
}

/** Called only inside runGuardedBattleRecordOperation, by HTTP and assistant alike. */
export async function writeBattleRecord(
    campaignId: string,
    userId: string,
    operation: RecordOperation,
    battleId: string | undefined,
    raw: unknown,
    execution?: ActionExecutionContext,
    preparedMap = false
) {
    const input = parseInput(recordSchemas[operation] as z.ZodType, raw);

    if (operation === 'create') {
        const data = input as z.infer<typeof createBattleSchema>;

        const map = data.mapId
            ? null
            : preparedMap
              ? data.map
              : await mapForWrite(data.map, campaignId);

        await assertParticipantSources(campaignId, data.participants);

        const createScene = (
            db: Pick<Prisma.TransactionClient, 'battleScene'>,
            linked?: Awaited<ReturnType<typeof linkedMapFor>>
        ) => {
            const stored = linked ? linked.header : map;

            return db.battleScene.create({
                data: {
                    campaignId,
                    name: data.name,
                    description: data.description,
                    status: 'prepared',
                    participants:
                        toInputJson(data.participants),
                    currentRound: 1,
                    currentTurnIndex: 0,
                    turnTimerSeconds: data.turnTimerSeconds ?? null,
                    ...(stored && { map: stored }),
                    ...(linked && {
                        mapId: linked.mapId,
                        mapVersion: linked.version,
                    }),
                },
            });
        };

        const { mapId } = data;

        if (!mapId) return createScene(prisma);

        return prisma.$transaction(async (tx) => {
            await lockMapRow(tx, mapId, 'share');

            return createScene(tx, await linkedMapFor(tx, campaignId, mapId));
        });
    }

    if (operation === 'clear-history' || operation === 'delete') {
        const rows =
            operation === 'delete'
                ? [await battleRecord(campaignId, requireBattleId(battleId))]
                : await prisma.battleScene.findMany({
                      where: { campaignId },
                      select: { id: true },
                  });

        const result = await prisma.battleScene.deleteMany({
            where: { campaignId, id: { in: rows.map((row) => row.id) } },
        });

        for (const row of rows) {
            if (execution)
                execution.afterCommit({
                    key: `${execution.intentId}:battle-delete:${row.id}`,
                    kind: 'invalidate',
                    payload: {
                        campaignId,
                        battleId: row.id,
                        battleLeftActive: true,
                    },
                });
        }

        if (!execution)
            afterContentCommit(() =>
                after(async () => {
                    for (const row of rows)
                        await clearShowBattle(campaignId, row.id);
                })
            );

        return operation === 'delete'
            ? { success: true }
            : { success: true, deletedCount: result.count };
    }

    const row =
        operation === 'audio'
            ? await prisma.battleScene.findFirst({
                  where: { id: requireBattleId(battleId), campaignId },
              })
            : await battleRecord(campaignId, requireBattleId(battleId));

    if (!row) throw new ContentError(API_ERRORS.NOT_FOUND, 404);

    if (operation === 'patch') {
        const {
            map: rawMap,
            mapId: relinkId,
            ...rest
        } = input as z.infer<typeof patchBattleSchema>;

        if (relinkId !== undefined && row.status !== 'prepared')
            throw new ContentError(API_ERRORS.BATTLE_MAP_RELINK_STARTED, 409);

        if (rest.participants)
            await assertParticipantSources(
                campaignId,
                rest.participants,
                sourceIdsOf(row.participants)
            );

        const written = preparedMap
            ? rawMap
            : await mapForWrite(rawMap, campaignId, row.map);

        const pinned =
            storedRecord<BattleMapConfig>().safeParse(row.map).data ?? null;

        const map =
            row.mapId && written && pinned
                ? toInputJson({
                      ...withoutEdges(written),
                      cols: pinned.cols,
                      rows: pinned.rows,
                      blocked: pinned.blocked,
                  })
                : row.mapId && written
                  ? (toInputJson(withoutEdges(written)))
                  : written;

        const unlink = row.mapId && map === null;

        const save = (
            db: Pick<
                Prisma.TransactionClient,
                'battleScene' | 'battleMapState'
            >,
            relink?: Awaited<ReturnType<typeof relinkData>>
        ) =>
            db.battleScene.update({
                where: { id: row.id, version: row.version },
                data: {
                    ...rest,
                    ...(rest.participants && {
                        participants:
                            toInputJson(rest.participants),
                    }),
                    ...(relink
                        ? relink
                        : {
                              ...(map !== undefined && {
                                  map: map ?? Prisma.DbNull,
                              }),
                              ...(unlink && { mapId: null, mapVersion: null }),
                          }),
                    version: { increment: 1 },
                },
            });

        if (relinkId === undefined) await save(prisma);
        else
            await prisma.$transaction(async (tx) => {
                if (relinkId) await lockMapRow(tx, relinkId, 'share');

                const relink = await relinkData(
                    tx,
                    campaignId,
                    row,
                    pinned,
                    relinkId
                );

                await save(tx, relink ?? undefined);

                if (relink && row.mapId !== relinkId)
                    await tx.battleMapState.deleteMany({
                        where: { battleId: row.id },
                    });
            });

        return { id: row.id, version: row.version + 1 };
    }

    const rate = await checkRateLimit({
        userId,
        scope: 'audio',
        battleId: row.id,
        ...BATTLE_RATE_LIMITS.audio,
    });

    if (!rate.allowed) throw new BattleAudioRateLimitError(rate);

    const cmd = input as z.infer<typeof battleAudioCommandSchema>;

    const prev = row.audio as BattleAudioState | null;

    const result = applyAudioCommand(prev, cmd, {
        now: Date.now(),
        library: commandNeedsLibrary(cmd)
            ? await loadAudioLibrary(campaignId)
            : [],
    });

    if (!result.ok) throw new ContentError(result.message, 422);

    const next = result.value;

    const { count } = await prisma.battleScene.updateMany({
        where: {
            id: row.id,
            campaignId,
            audio: prev
                ? { path: ['seq'], equals: prev.seq }
                : { equals: Prisma.DbNull },
        },
        data: { audio: toInputJson(next) },
    });

    if (!count) throw new ContentError(API_ERRORS.BATTLE_AUDIO_CONFLICT, 409);

    const message = {
        channel: battleChannelName(row.id),
        event: BATTLE_AUDIO_EVENT,
        payload: { battleId: row.id, audio: next },
    };

    if (execution)
        execution.afterCommit({
            key: `${execution.intentId}:battle-audio`,
            kind: 'publish',
            payload: JSON.parse(JSON.stringify({ battleMessages: [message] })),
        });
    else
        afterContentCommit(() =>
            after(() =>
                safePusherTrigger(
                    pusherServer,
                    message.channel,
                    message.event,
                    message.payload,
                    { action: 'battle audio' }
                )
            )
        );

    return { audio: next };
}
