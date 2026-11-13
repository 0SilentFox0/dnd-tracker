import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { conflict } from '../errors';
import type {
    ActionExecutionContext,
    ActionPreview,
    ActionResult,
    AssistantCaller,
    TargetRef,
} from '../types';

import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { isDemoKind } from '@/lib/constants/campaigns';
import {
    DEFAULT_ZONE_COLOR,
    MAX_MARKERS_PER_MAP,
    MAX_WORLD_MAPS,
} from '@/lib/constants/world';
import { prisma } from '@/lib/db';
import {
    createWorldMapSchema,
    createWorldMarkerSchema,
    createWorldNoteSchema,
    enterSchema,
    exitSchema,
    restWorldSchema,
    travelSchema,
    updateWorldMapSchema,
    updateWorldMarkerSchema,
} from '@/lib/schemas/world';
import { ContentError } from '@/lib/server/content/errors';
import { lockWorldMap } from '@/lib/server/world/lock';
import { subtreeTargets } from '@/lib/server/world/map-handlers';
import {
    orphanedImagesOfSubtree,
    toWorldMap,
    toWorldMarker,
} from '@/lib/server/world/map-store';
import { noteInclude, toNote } from '@/lib/server/world/note-store';
import { applyWorldRest } from '@/lib/server/world/rest';
import {
    activePlayerHeroes,
    commitTravel,
    readPositions,
    toDmHeroes,
    writeRestLog,
} from '@/lib/server/world/travel-store';
import { ownedWorldMapPath } from '@/lib/supabase/world-map-storage';
import type { CampaignAccessResult } from '@/lib/utils/api/api-auth';
import { requestDigest } from '@/lib/utils/battle/store/stable-json';
import { classesEnabled } from '@/lib/utils/characters/classes/classes-enabled';
import { jsonContent } from '@/lib/utils/common/json';
import { parseRules } from '@/lib/utils/rules/schema';
import { polygonCentroid } from '@/lib/utils/world/geometry';
import { planEnter, planExit, planTravel } from '@/lib/utils/world/travel';

const id = z.string().min(1);

const createPublicWorldNoteSchema = createWorldNoteSchema
    .pick({ markerId: true, text: true })
    .extend({ visibility: z.literal('public') })
    .strict();

const updatePublicWorldNoteSchema = z
    .strictObject({
        text: createWorldNoteSchema.shape.text.optional(),
        visibility: z.literal('public').optional(),
    })
    .refine(
        (value) => Object.keys(value).length > 0,
        'world.validation.nothingToUpdate'
    );

export const WORLD_ACTION_INPUTS = {
    'maps.create': createWorldMapSchema,
    'maps.update': z.strictObject({ mapId: id, patch: updateWorldMapSchema }),
    'maps.delete': z.strictObject({ mapId: id }),
    'markers.create': createWorldMarkerSchema,
    'markers.update': z.strictObject({
        markerId: id,
        patch: updateWorldMarkerSchema,
    }),
    'markers.delete': z.strictObject({ markerId: id }),
    'notes.create': createPublicWorldNoteSchema,
    'notes.update': z.strictObject({
        noteId: id,
        patch: updatePublicWorldNoteSchema,
    }),
    'notes.delete': z.strictObject({ noteId: id }),
    travel: travelSchema,
    enter: enterSchema,
    exit: exitSchema,
    rest: restWorldSchema,
} as const;

export type WorldOperation = keyof typeof WORLD_ACTION_INPUTS;

const parsedInput = (operation: WorldOperation, input: unknown) =>
    WORLD_ACTION_INPUTS[operation].parse(input) as Record<string, unknown>;

const getCampaignId = (caller: AssistantCaller) => caller.actor.campaignId;

async function worldState(
    caller: AssistantCaller,
    operation: WorldOperation,
    input: Record<string, unknown>
) {
    const campaignId = getCampaignId(caller);

    const restKind =
        operation === 'rest'
            ? input.kind
            : ['travel', 'enter', 'exit'].includes(operation)
              ? input.rest
              : 'none';

    let restRules:
        | {
              outOfCombat: ReturnType<typeof parseRules>['outOfCombat'];
              classesEnabled: boolean;
          }
        | undefined;

    if (restKind !== 'none') {
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            select: { rules: true },
        });

        if (!campaign)
            throw new ContentError(API_ERRORS.CAMPAIGN_NOT_FOUND, 404);

        const rules = parseRules(campaign.rules);

        restRules = {
            outOfCombat: rules.outOfCombat,
            classesEnabled: classesEnabled(rules),
        };
    }

    switch (operation) {
        case 'maps.create': {
            const [maps, parent] = await Promise.all([
                prisma.worldMap.findMany({
                    where: { campaignId },
                    select: { id: true, parentMarkerId: true },
                }),
                input.parentMarkerId
                    ? prisma.worldMarker.findFirst({
                          where: {
                              id: String(input.parentMarkerId),
                              map: { campaignId },
                          },
                          include: { childMap: { select: { id: true } } },
                      })
                    : null,
            ]);

            return {
                mapCount: maps.length,
                rootExists: maps.some((map) => map.parentMarkerId === null),
                parent: parent
                    ? { id: parent.id, childMapId: parent.childMap?.id ?? null }
                    : null,
            };
        }
        case 'maps.update': {
            const row = await prisma.worldMap.findFirst({
                where: { id: String(input.mapId), campaignId },
            });

            if (!row)
                throw new ContentError(API_ERRORS.WORLD_MAP_NOT_FOUND, 404);

            return row;
        }
        case 'maps.delete': {
            const row = await prisma.worldMap.findFirst({
                where: { id: String(input.mapId), campaignId },
            });

            if (!row)
                throw new ContentError(API_ERRORS.WORLD_MAP_NOT_FOUND, 404);

            const [targets, files] = await Promise.all([
                subtreeTargets(campaignId, row.id),
                orphanedImagesOfSubtree(campaignId, row.id),
            ]);

            return {
                row,
                targets: {
                    mapIds: targets.mapIds.sort(),
                    markerIds: targets.markerIds.sort(),
                },
                files: files.sort(),
            };
        }
        case 'markers.create': {
            const row = await prisma.worldMap.findFirst({
                where: { id: String(input.mapId), campaignId },
                select: { id: true, markers: { select: { sortOrder: true } } },
            });

            if (!row)
                throw new ContentError(API_ERRORS.WORLD_MAP_NOT_FOUND, 404);

            return {
                mapId: row.id,
                markerCount: row.markers.length,
                maxSortOrder: Math.max(
                    -1,
                    ...row.markers.map((marker) => marker.sortOrder)
                ),
            };
        }
        case 'markers.update':
        case 'markers.delete': {
            const row = await prisma.worldMarker.findFirst({
                where: { id: String(input.markerId), map: { campaignId } },
                include: { map: true, childMap: { select: { id: true } } },
            });

            if (!row)
                throw new ContentError(API_ERRORS.WORLD_MARKER_NOT_FOUND, 404);

            if (operation === 'markers.delete' && row.childMap) {
                const [targets, files] = await Promise.all([
                    subtreeTargets(campaignId, row.childMap.id),
                    orphanedImagesOfSubtree(campaignId, row.childMap.id),
                ]);

                return {
                    row,
                    targets: {
                        mapIds: targets.mapIds.sort(),
                        markerIds: targets.markerIds.sort(),
                    },
                    files: files.sort(),
                };
            }

            return row;
        }
        case 'notes.create': {
            const marker = await prisma.worldMarker.findFirst({
                where: { id: String(input.markerId), map: { campaignId } },
            });

            if (!marker)
                throw new ContentError(API_ERRORS.WORLD_MARKER_NOT_FOUND, 404);

            return marker;
        }
        case 'notes.update':
        case 'notes.delete': {
            const note = await prisma.worldNote.findFirst({
                where: {
                    id: String(input.noteId),
                    marker: { map: { campaignId } },
                },
                include: { ...noteInclude, marker: { include: { map: true } } },
            });

            if (
                !note ||
                (note.visibility === 'private' &&
                    note.authorUserId !== caller.actor.userId)
            )
                throw new ContentError(API_ERRORS.WORLD_NOTE_NOT_FOUND, 404);

            if (
                operation === 'notes.update' &&
                note.authorUserId !== caller.actor.userId
            )
                throw new ContentError(API_ERRORS.WORLD_NOTE_FORBIDDEN, 403);

            return note;
        }
        case 'travel': {
            const ids = input.characterIds as string[];

            const [map, heroes, positions] = await Promise.all([
                prisma.worldMap.findFirst({
                    where: { id: String(input.mapId), campaignId },
                }),
                activePlayerHeroes(campaignId, { id: { in: ids } }),
                readPositions(ids),
            ]);

            if (!map)
                throw new ContentError(API_ERRORS.WORLD_MAP_NOT_FOUND, 404);

            const [marker, reveals, characters] = await Promise.all([
                input.toMarkerId
                    ? prisma.worldMarker.findFirst({
                          where: {
                              id: String(input.toMarkerId),
                              mapId: map.id,
                          },
                          select: { id: true },
                      })
                    : null,
                prisma.worldReveal.findMany({
                    where: { mapId: map.id, characterId: { in: ids } },
                    select: { id: true, characterId: true, shape: true },
                }),
                input.rest !== 'none'
                    ? prisma.character.findMany({
                          where: { id: { in: ids }, campaignId },
                          select: { id: true, resources: true, classes: true },
                      })
                    : [],
            ]);

            return {
                map,
                marker,
                heroes: heroes.sort((a, b) => a.id.localeCompare(b.id)),
                positions: [...positions].sort(([a], [b]) =>
                    a.localeCompare(b)
                ),
                reveals: reveals.sort((a, b) => a.id.localeCompare(b.id)),
                characters: characters.sort((a, b) => a.id.localeCompare(b.id)),
                ...(restRules ? { restRules } : {}),
            };
        }
        case 'enter': {
            const marker = await prisma.worldMarker.findFirst({
                where: { id: String(input.markerId), map: { campaignId } },
                include: { childMap: true },
            });

            if (!marker)
                throw new ContentError(API_ERRORS.WORLD_MARKER_NOT_FOUND, 404);

            const heroes = await activePlayerHeroes(campaignId, {
                id: { in: input.characterIds as string[] },
            });

            const positions = await readPositions(
                input.characterIds as string[]
            );

            const [reveals, characters] = marker.childMap
                ? await Promise.all([
                      prisma.worldReveal.findMany({
                          where: {
                              mapId: marker.childMap.id,
                              characterId: {
                                  in: input.characterIds as string[],
                              },
                          },
                          select: { id: true, characterId: true, shape: true },
                      }),
                      input.rest !== 'none'
                          ? prisma.character.findMany({
                                where: {
                                    id: { in: input.characterIds as string[] },
                                    campaignId,
                                },
                                select: {
                                    id: true,
                                    resources: true,
                                    classes: true,
                                },
                            })
                          : [],
                  ])
                : [[], []];

            return {
                marker,
                heroes: heroes.sort((a, b) => a.id.localeCompare(b.id)),
                positions: [...positions].sort(([a], [b]) =>
                    a.localeCompare(b)
                ),
                reveals: reveals.sort((a, b) => a.id.localeCompare(b.id)),
                characters: characters.sort((a, b) => a.id.localeCompare(b.id)),
                ...(restRules ? { restRules } : {}),
            };
        }
        case 'exit': {
            const map = await prisma.worldMap.findFirst({
                where: { id: String(input.mapId), campaignId },
                include: { parentMarker: true },
            });

            if (!map)
                throw new ContentError(API_ERRORS.WORLD_MAP_NOT_FOUND, 404);

            const heroes = await activePlayerHeroes(campaignId, {
                id: { in: input.characterIds as string[] },
            });

            const positions = await readPositions(
                input.characterIds as string[]
            );

            const destMapId = map.parentMarker?.mapId;

            const [reveals, characters] = destMapId
                ? await Promise.all([
                      prisma.worldReveal.findMany({
                          where: {
                              mapId: destMapId,
                              characterId: {
                                  in: input.characterIds as string[],
                              },
                          },
                          select: { id: true, characterId: true, shape: true },
                      }),
                      input.rest !== 'none'
                          ? prisma.character.findMany({
                                where: {
                                    id: { in: input.characterIds as string[] },
                                    campaignId,
                                },
                                select: {
                                    id: true,
                                    resources: true,
                                    classes: true,
                                },
                            })
                          : [],
                  ])
                : [[], []];

            return {
                map,
                heroes: heroes.sort((a, b) => a.id.localeCompare(b.id)),
                positions: [...positions].sort(([a], [b]) =>
                    a.localeCompare(b)
                ),
                reveals: reveals.sort((a, b) => a.id.localeCompare(b.id)),
                characters: characters.sort((a, b) => a.id.localeCompare(b.id)),
                ...(restRules ? { restRules } : {}),
            };
        }
        case 'rest': {
            const [map, heroes, positions] = await Promise.all([
                prisma.worldMap.findFirst({
                    where: { id: String(input.mapId), campaignId },
                }),
                activePlayerHeroes(campaignId, {
                    id: { in: input.characterIds as string[] },
                }),
                readPositions(input.characterIds as string[]),
            ]);

            if (!map)
                throw new ContentError(API_ERRORS.WORLD_MAP_NOT_FOUND, 404);

            const characters = await prisma.character.findMany({
                where: {
                    id: { in: input.characterIds as string[] },
                    campaignId,
                },
                select: { id: true, resources: true, classes: true },
            });

            return {
                map,
                heroes: heroes.sort((a, b) => a.id.localeCompare(b.id)),
                positions: [...positions].sort(([a], [b]) =>
                    a.localeCompare(b)
                ),
                characters: characters.sort((a, b) => a.id.localeCompare(b.id)),
                ...(restRules ? { restRules } : {}),
            };
        }
    }
}

async function requireOwnedMap(campaignId: string, mapId: string) {
    const map = await prisma.worldMap.findFirst({
        where: { id: mapId, campaignId },
    });

    if (!map) throw new ContentError(API_ERRORS.WORLD_MAP_NOT_FOUND, 404);

    return map;
}

async function requireOwnedMarker(campaignId: string, markerId: string) {
    const marker = await prisma.worldMarker.findFirst({
        where: { id: markerId, map: { campaignId } },
        include: {
            map: { select: { campaignId: true } },
            childMap: { select: { id: true } },
        },
    });

    if (!marker) throw new ContentError(API_ERRORS.WORLD_MARKER_NOT_FOUND, 404);

    return marker;
}

async function dmAccess(
    caller: AssistantCaller
): Promise<CampaignAccessResult> {
    const campaignId = getCampaignId(caller);

    const row = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: {
            id: true,
            kind: true,
            maxLevel: true,
            rules: true,
            allowPlayerEdit: true,
            members: {
                where: { userId: caller.actor.userId },
                select: { userId: true, role: true },
            },
        },
    });

    if (!row) throw new ContentError(API_ERRORS.CAMPAIGN_NOT_FOUND, 404);

    return {
        userId: caller.actor.userId,
        isDM: true,
        isDemo: isDemoKind(row.kind),
        campaign: { ...row, rules: parseRules(row.rules) },
    };
}

export async function prepareWorldAction(
    caller: AssistantCaller,
    operation: WorldOperation,
    raw: unknown
): Promise<ActionPreview> {
    const input = parsedInput(operation, raw);

    const current = await worldState(caller, operation, input);

    const mapTarget: TargetRef = {
        domain: 'world-map',
        id: String(input.mapId ?? 'new'),
        name: String(
            (current as { name?: string } | null)?.name ?? 'World map'
        ),
    };

    const target: TargetRef = operation.startsWith('markers.')
        ? {
              domain: 'world-marker',
              id: String(input.markerId ?? 'new'),
              name: String(
                  (current as { name?: string } | null)?.name ?? 'World marker'
              ),
          }
        : operation.startsWith('notes.')
          ? {
                domain: 'world-note',
                id: String(input.noteId ?? 'new'),
                name: 'World note',
            }
          : mapTarget;

    return {
        summary: `World map: ${operation}`,
        targets: [target],
        changes: [
            {
                target,
                path: operation,
                before: jsonContent(current ?? null),
                after: jsonContent(input),
            },
        ],
        warnings: ['World changes may affect the shared campaign map.'],
        preconditions: { fingerprint: requestDigest(current) },
        effects: [
            {
                kind: operation.endsWith('delete')
                    ? 'delete'
                    : operation.endsWith('create')
                      ? 'create'
                      : 'update',
                targets: [target],
                description: `World map: ${operation}`,
            },
        ],
    };
}

export async function runWorldAction(
    ctx: ActionExecutionContext,
    operation: WorldOperation,
    raw: unknown
): Promise<ActionResult> {
    // The assistant executor wraps this action in runContentWriteContext; the scoped prisma proxy keeps these operations and nested domain-service transactions on ctx.db.
    const input = parsedInput(operation, raw);

    const campaignId = getCampaignId(ctx.caller);

    const before = await worldState(ctx.caller, operation, input);

    if (
        requestDigest(before) !==
        (ctx.expected as { fingerprint?: string })?.fingerprint
    )
        throw conflict();

    const mapIdForEvent = (mapId: string | null) =>
        ctx.afterCommit({
            key: `world-event:${ctx.intentId}`,
            kind: 'world-changed',
            payload: jsonContent({ campaignId, mapId }),
        });

    let data: unknown;

    let affected: TargetRef[] = [];

    switch (operation) {
        case 'maps.create': {
            const body = createWorldMapSchema.parse(input);

            if (!ownedWorldMapPath(campaignId, body.imageUrl))
                throw new ContentError(API_ERRORS.WORLD_IMAGE_FOREIGN, 400);

            if (
                (await prisma.worldMap.count({ where: { campaignId } })) >=
                MAX_WORLD_MAPS
            )
                throw new ContentError(API_ERRORS.WORLD_MAPS_LIMIT, 409);

            if (body.parentMarkerId) {
                const parent = await requireOwnedMarker(
                    campaignId,
                    body.parentMarkerId
                );

                if (!parent || parent.childMap)
                    throw new ContentError(API_ERRORS.WORLD_NESTED_EXISTS, 409);
            } else if (
                await prisma.worldMap.findFirst({
                    where: { campaignId, parentMarkerId: null },
                    select: { id: true },
                })
            )
                throw new ContentError(API_ERRORS.WORLD_ROOT_EXISTS, 409);

            const row = await prisma.worldMap.create({
                data: {
                    campaignId,
                    name: body.name,
                    imageUrl: body.imageUrl,
                    width: body.width,
                    height: body.height,
                    parentMarkerId: body.parentMarkerId ?? null,
                },
                include: { parentMarker: { select: { mapId: true } } },
            });

            data = toWorldMap(row);
            affected = [{ domain: 'world-map', id: row.id, name: row.name }];
            mapIdForEvent(row.id);
            break;
        }
        case 'maps.update': {
            const body = input.patch as Record<string, unknown>;

            const old = await prisma.worldMap.findFirst({
                where: { id: String(input.mapId), campaignId },
            });

            if (!old)
                throw new ContentError(API_ERRORS.WORLD_MAP_NOT_FOUND, 404);

            const newImage =
                body.imageUrl !== undefined && body.imageUrl !== old.imageUrl
                    ? String(body.imageUrl)
                    : null;

            if (newImage && !ownedWorldMapPath(campaignId, newImage))
                throw new ContentError(API_ERRORS.WORLD_IMAGE_FOREIGN, 400);

            const row = await prisma.worldMap.update({
                where: { id: old.id },
                data: body,
                include: { parentMarker: { select: { mapId: true } } },
            });

            data = toWorldMap(row);
            affected = [{ domain: 'world-map', id: row.id, name: row.name }];

            if (
                newImage &&
                (await prisma.worldMap.count({
                    where: { campaignId, imageUrl: old.imageUrl },
                })) === 0
            )
                ctx.afterCommit({
                    key: `world-file:${ctx.intentId}`,
                    kind: 'media-cleanup',
                    payload: jsonContent({
                        campaignId,
                        worldMapUrls: [old.imageUrl],
                    }),
                });

            mapIdForEvent(row.id);
            break;
        }
        case 'maps.delete': {
            const id = String(input.mapId);

            const { targets: gone, files } = before as {
                targets: { mapIds: string[]; markerIds: string[] };
                files: string[];
            };

            const old = (before as { row: { name: string } }).row;

            await prisma.worldMap.delete({ where: { id } });
            data = { ok: true, removed: gone.mapIds.length };
            affected = [{ domain: 'world-map', id, name: old.name }];
            ctx.afterCommit({
                key: `world-delete:${ctx.intentId}`,
                kind: 'world-delete',
                payload: jsonContent({ campaignId, ...gone, files }),
            });
            mapIdForEvent(null);
            break;
        }
        case 'markers.create': {
            const body = createWorldMarkerSchema.parse(input);

            const map = await prisma.worldMap.findFirst({
                where: { id: body.mapId, campaignId },
            });

            if (!map)
                throw new ContentError(API_ERRORS.WORLD_MAP_NOT_FOUND, 404);

            const zone =
                body.kind === 'zone' && body.polygon ? body.polygon : null;

            const point = zone ? polygonCentroid(zone) : body;

            const row = await prisma.$transaction(async (tx) => {
                await lockWorldMap(tx, body.mapId);

                const { _count, _max } = await tx.worldMarker.aggregate({
                    where: { mapId: body.mapId },
                    _count: true,
                    _max: { sortOrder: true },
                });

                if (_count >= MAX_MARKERS_PER_MAP)
                    throw new ContentError(API_ERRORS.WORLD_MARKERS_LIMIT, 409);

                return tx.worldMarker.create({
                    data: {
                        mapId: body.mapId,
                        kind: body.kind,
                        ...point,
                        polygon: body.polygon ?? undefined,
                        name: body.name,
                        icon: body.icon ?? null,
                        color: body.color ?? (zone ? DEFAULT_ZONE_COLOR : null),
                        sortOrder: (_max.sortOrder ?? -1) + 1,
                    },
                });
            });

            data = toWorldMarker(row);
            affected = [{ domain: 'world-marker', id: row.id, name: row.name }];
            mapIdForEvent(body.mapId);
            break;
        }
        case 'markers.update': {
            const id = String(input.markerId);

            const body = updateWorldMarkerSchema.parse(input.patch);

            const owned = await prisma.worldMarker.findFirst({
                where: { id, map: { campaignId } },
            });

            if (!owned)
                throw new ContentError(API_ERRORS.WORLD_MARKER_NOT_FOUND, 404);

            const { x, y, polygon, ...rest } = body;

            const update: Prisma.WorldMarkerUpdateInput = { ...rest };

            if (owned.kind === 'zone') {
                if (polygon === null)
                    throw new ContentError(
                        API_ERRORS.WORLD_POLYGON_INVALID,
                        400
                    );

                if (polygon)
                    Object.assign(update, {
                        polygon,
                        ...polygonCentroid(polygon),
                    });
            } else if (polygon !== undefined)
                throw new ContentError(API_ERRORS.WORLD_POLYGON_INVALID, 400);
            else {
                if (x !== undefined) update.x = x;

                if (y !== undefined) update.y = y;
            }

            const row = await prisma.worldMarker.update({
                where: { id },
                data: update,
                include: { childMap: { select: { id: true } } },
            });

            data = toWorldMarker(row);
            affected = [{ domain: 'world-marker', id, name: row.name }];
            mapIdForEvent(owned.mapId);
            break;
        }
        case 'markers.delete': {
            const id = String(input.markerId);

            const marker = await prisma.worldMarker.findFirst({
                where: { id, map: { campaignId } },
                include: { childMap: { select: { id: true } } },
            });

            if (!marker)
                throw new ContentError(API_ERRORS.WORLD_MARKER_NOT_FOUND, 404);

            const oldState = before as {
                targets?: { mapIds: string[]; markerIds: string[] };
                files?: string[];
            };

            const gone = oldState.targets ?? { mapIds: [], markerIds: [] };

            const files = oldState.files ?? [];

            await prisma.worldMarker.delete({ where: { id } });
            data = { ok: true };
            affected = [{ domain: 'world-marker', id, name: marker.name }];
            ctx.afterCommit({
                key: `world-delete:${ctx.intentId}`,
                kind: 'world-delete',
                payload: jsonContent({
                    campaignId,
                    mapIds: gone.mapIds,
                    markerIds: [id, ...gone.markerIds],
                    files,
                }),
            });
            mapIdForEvent(marker.mapId);
            break;
        }
        case 'notes.create': {
            const body = createPublicWorldNoteSchema.parse(input);

            const marker = await requireOwnedMarker(campaignId, body.markerId);

            if (!marker)
                throw new ContentError(API_ERRORS.WORLD_MARKER_NOT_FOUND, 404);

            const row = await prisma.worldNote.create({
                data: {
                    markerId: marker.id,
                    authorUserId: ctx.caller.actor.userId,
                    characterId: null,
                    visibility: 'public',
                    text: body.text,
                },
                include: noteInclude,
            });

            data = toNote(row, ctx.caller.actor.userId);
            affected = [
                { domain: 'world-note', id: row.id, name: 'World note' },
            ];
            mapIdForEvent(marker.mapId);
            break;
        }
        case 'notes.update': {
            const id = String(input.noteId);

            const body = updatePublicWorldNoteSchema.parse(input.patch);

            const row = await prisma.worldNote.findFirst({
                where: { id, marker: { map: { campaignId } } },
                include: { ...noteInclude, marker: true },
            });

            if (!row || row.authorUserId !== ctx.caller.actor.userId)
                throw new ContentError(API_ERRORS.WORLD_NOTE_FORBIDDEN, 403);

            const updated = await prisma.worldNote.update({
                where: { id },
                data: body,
                include: noteInclude,
            });

            data = toNote(updated, ctx.caller.actor.userId);
            affected = [{ domain: 'world-note', id, name: 'World note' }];
            mapIdForEvent(row.marker.mapId);
            break;
        }
        case 'notes.delete': {
            const id = String(input.noteId);

            const row = await prisma.worldNote.findFirst({
                where: { id, marker: { map: { campaignId } } },
                include: { marker: true },
            });

            if (
                !row ||
                (row.visibility === 'private' &&
                    row.authorUserId !== ctx.caller.actor.userId)
            )
                throw new ContentError(API_ERRORS.WORLD_NOTE_NOT_FOUND, 404);

            if (
                row.visibility !== 'public' &&
                row.authorUserId !== ctx.caller.actor.userId
            )
                throw new ContentError(API_ERRORS.WORLD_NOTE_FORBIDDEN, 403);

            await prisma.worldNote.delete({ where: { id } });
            data = { ok: true };
            affected = [{ domain: 'world-note', id, name: 'World note' }];

            if (row.visibility === 'public') mapIdForEvent(row.marker.mapId);

            break;
        }
        case 'travel':
        case 'enter':
        case 'exit':
        case 'rest': {
            const access = await dmAccess(ctx.caller);

            const result = await runTravelOperation(access, operation, input);

            data = result.data;
            affected = result.affected;

            if (result.mapId) mapIdForEvent(result.mapId);

            break;
        }
    }

    return { data: jsonContent(data), affected, warnings: [] };
}

async function runTravelOperation(
    access: CampaignAccessResult,
    operation: WorldOperation,
    input: Record<string, unknown>
): Promise<{ data: unknown; affected: TargetRef[]; mapId: string | null }> {
    const campaignId = access.campaign.id;

    const ids = input.characterIds as string[];

    const heroes = await activePlayerHeroes(campaignId, { id: { in: ids } });

    if (heroes.length !== ids.length)
        throw new ContentError(API_ERRORS.WORLD_HERO_INVALID, 400);

    const positions = await readPositions(ids);

    if (operation === 'rest') {
        const body = restWorldSchema.parse(input);

        const map = await requireOwnedMap(campaignId, body.mapId);

        const first = positions.get(ids[0]);

        if (!first || ids.some((id) => positions.get(id)?.mapId !== map.id))
            throw new ContentError(API_ERRORS.WORLD_HERO_INVALID, 400);

        const { applied } = await applyWorldRest(access, body.kind, ids);

        if (applied)
            await writeRestLog({
                campaignId,
                userId: access.userId,
                mapId: map.id,
                kind: body.kind,
                characterIds: ids,
                at: { x: first.x, y: first.y },
            });

        return {
            data: { ok: true, applied },
            affected: heroes.map((h) => ({
                domain: 'character',
                id: h.id,
                name: h.name,
            })),
            mapId: applied ? map.id : null,
        };
    }

    if (operation === 'travel') {
        const body = travelSchema.parse(input);

        const map = await prisma.worldMap.findFirst({
            where: { id: body.mapId, campaignId },
        });

        if (!map) throw new ContentError(API_ERRORS.WORLD_MAP_NOT_FOUND, 404);

        if (body.rest !== 'none') await applyWorldRest(access, body.rest, ids);

        const marker = body.toMarkerId
            ? await prisma.worldMarker.findFirst({
                  where: { id: body.toMarkerId, mapId: map.id },
                  select: { id: true },
              })
            : null;

        const plan = planTravel({
            positions,
            characterIds: ids,
            mapId: map.id,
            to: body.to,
            radius: map.revealRadius,
            aspect: map.width / map.height,
        });

        await commitTravel({
            campaignId,
            userId: access.userId,
            dest: map,
            plan,
            positions,
            rest: body.rest,
            toMarkerId: marker?.id ?? null,
            kind: 'travel',
        });

        const at = new Map(
            plan.moves.map((m) => [
                m.characterId,
                { mapId: map.id, x: m.to.x, y: m.to.y },
            ])
        );

        return {
            data: {
                ok: true,
                positions: toDmHeroes(heroes, (id) => at.get(id)),
            },
            affected: heroes.map((h) => ({
                domain: 'character',
                id: h.id,
                name: h.name,
            })),
            mapId: map.id,
        };
    }

    if (operation === 'enter') {
        const body = enterSchema.parse(input);

        const marker = await requireOwnedMarker(campaignId, body.markerId);

        if (!marker)
            throw new ContentError(API_ERRORS.WORLD_MARKER_NOT_FOUND, 404);

        const child = marker.childMap
            ? await prisma.worldMap.findUnique({
                  where: { id: marker.childMap.id },
              })
            : null;

        if (!child)
            throw new ContentError(API_ERRORS.WORLD_MARKER_NO_CHILD, 409);

        if (body.rest !== 'none') await applyWorldRest(access, body.rest, ids);

        const plan = planEnter({ marker, childMap: child, characterIds: ids });

        await commitTravel({
            campaignId,
            userId: access.userId,
            dest: child,
            plan,
            positions,
            rest: body.rest,
            toMarkerId: null,
            kind: 'enter',
        });

        const at = new Map(
            plan.moves.map((m) => [
                m.characterId,
                { mapId: child.id, x: m.to.x, y: m.to.y },
            ])
        );

        return {
            data: {
                ok: true,
                positions: toDmHeroes(heroes, (id) => at.get(id)),
            },
            affected: heroes.map((h) => ({
                domain: 'character',
                id: h.id,
                name: h.name,
            })),
            mapId: child.id,
        };
    }

    const body = exitSchema.parse(input);

    const map = await requireOwnedMap(campaignId, body.mapId);

    const parentMarker = map.parentMarkerId
        ? await prisma.worldMarker.findUnique({
              where: { id: map.parentMarkerId },
              select: { id: true, mapId: true, x: true, y: true },
          })
        : null;

    if (!parentMarker) throw new ContentError(API_ERRORS.WORLD_NOT_NESTED, 409);

    if (ids.some((id) => positions.get(id)?.mapId !== map.id))
        throw new ContentError(API_ERRORS.WORLD_HERO_INVALID, 400);

    const dest = await prisma.worldMap.findUnique({
        where: { id: parentMarker.mapId },
    });

    if (!dest) throw new ContentError(API_ERRORS.WORLD_MAP_NOT_FOUND, 404);

    if (body.rest !== 'none') await applyWorldRest(access, body.rest, ids);

    const plan = planExit({
        map: { id: map.id, parentMarker },
        characterIds: ids,
    });

    await commitTravel({
        campaignId,
        userId: access.userId,
        dest,
        plan,
        positions,
        rest: body.rest,
        toMarkerId: parentMarker.id,
        kind: 'exit',
    });

    const at = new Map(
        plan.moves.map((m) => [
            m.characterId,
            { mapId: dest.id, x: m.to.x, y: m.to.y },
        ])
    );

    return {
        data: { ok: true, positions: toDmHeroes(heroes, (id) => at.get(id)) },
        affected: heroes.map((h) => ({
            domain: 'character',
            id: h.id,
            name: h.name,
        })),
        mapId: dest.id,
    };
}
