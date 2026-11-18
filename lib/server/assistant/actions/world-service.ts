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

type RestRules = {
    outOfCombat: ReturnType<typeof parseRules>['outOfCombat'];
    classesEnabled: boolean;
};

type StateArgs = {
    caller: AssistantCaller;
    campaignId: string;
    operation: WorldOperation;
    input: Record<string, unknown>;
    restRules?: RestRules;
};

type TargetsState = {
    targets: { mapIds: string[]; markerIds: string[] };
    files: string[];
};

const byId = <T extends { id: string }>(rows: T[]) =>
    rows.sort((a, b) => a.id.localeCompare(b.id));

const mapNotFound = () =>
    new ContentError(API_ERRORS.WORLD_MAP_NOT_FOUND, 404);

const markerNotFound = () =>
    new ContentError(API_ERRORS.WORLD_MARKER_NOT_FOUND, 404);

async function subtreeState(
    campaignId: string,
    mapId: string
): Promise<TargetsState> {
    const [targets, files] = await Promise.all([
        subtreeTargets(campaignId, mapId),
        orphanedImagesOfSubtree(campaignId, mapId),
    ]);

    return {
        targets: {
            mapIds: targets.mapIds.sort(),
            markerIds: targets.markerIds.sort(),
        },
        files: files.sort(),
    };
}

const findMap = (campaignId: string, mapId: unknown) =>
    prisma.worldMap.findFirst({ where: { id: String(mapId), campaignId } });

async function loadRestRules(
    campaignId: string,
    operation: WorldOperation,
    input: Record<string, unknown>
): Promise<RestRules | undefined> {
    const restKind =
        operation === 'rest'
            ? input.kind
            : ['travel', 'enter', 'exit'].includes(operation)
              ? input.rest
              : 'none';

    if (restKind === 'none') return undefined;

    const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { rules: true },
    });

    if (!campaign) throw new ContentError(API_ERRORS.CAMPAIGN_NOT_FOUND, 404);

    const rules = parseRules(campaign.rules);

    return {
        outOfCombat: rules.outOfCombat,
        classesEnabled: classesEnabled(rules),
    };
}

async function mapsCreateState({ campaignId, input }: StateArgs) {
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

async function mapsUpdateState({ campaignId, input }: StateArgs) {
    const row = await findMap(campaignId, input.mapId);

    if (!row) throw mapNotFound();

    return row;
}

async function mapsDeleteState({ campaignId, input }: StateArgs) {
    const row = await findMap(campaignId, input.mapId);

    if (!row) throw mapNotFound();

    return { row, ...(await subtreeState(campaignId, row.id)) };
}

async function markersCreateState({ campaignId, input }: StateArgs) {
    const row = await prisma.worldMap.findFirst({
        where: { id: String(input.mapId), campaignId },
        select: { id: true, markers: { select: { sortOrder: true } } },
    });

    if (!row) throw mapNotFound();

    return {
        mapId: row.id,
        markerCount: row.markers.length,
        maxSortOrder: Math.max(
            -1,
            ...row.markers.map((marker) => marker.sortOrder)
        ),
    };
}

async function markerMutationState({
    campaignId,
    input,
    operation,
}: StateArgs) {
    const row = await prisma.worldMarker.findFirst({
        where: { id: String(input.markerId), map: { campaignId } },
        include: { map: true, childMap: { select: { id: true } } },
    });

    if (!row) throw markerNotFound();

    if (operation === 'markers.delete' && row.childMap)
        return { row, ...(await subtreeState(campaignId, row.childMap.id)) };

    return row;
}

async function notesCreateState({ campaignId, input }: StateArgs) {
    const marker = await prisma.worldMarker.findFirst({
        where: { id: String(input.markerId), map: { campaignId } },
    });

    if (!marker) throw markerNotFound();

    return marker;
}

async function noteMutationState({
    caller,
    campaignId,
    input,
    operation,
}: StateArgs) {
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

const withRestRules = (restRules: RestRules | undefined) =>
    restRules ? { restRules } : {};

const loadRestCharacters = (
    campaignId: string,
    ids: string[],
    needed: boolean
) =>
    needed
        ? prisma.character.findMany({
              where: { id: { in: ids }, campaignId },
              select: { id: true, resources: true, classes: true },
          })
        : [];

const loadReveals = (mapId: string, ids: string[]) =>
    prisma.worldReveal.findMany({
        where: { mapId, characterId: { in: ids } },
        select: { id: true, characterId: true, shape: true },
    });

async function travelState({ campaignId, input, restRules }: StateArgs) {
    const ids = input.characterIds as string[];

    const [map, heroes, positions] = await Promise.all([
        findMap(campaignId, input.mapId),
        activePlayerHeroes(campaignId, { id: { in: ids } }),
        readPositions(ids),
    ]);

    if (!map) throw mapNotFound();

    const [marker, reveals, characters] = await Promise.all([
        input.toMarkerId
            ? prisma.worldMarker.findFirst({
                  where: { id: String(input.toMarkerId), mapId: map.id },
                  select: { id: true },
              })
            : null,
        loadReveals(map.id, ids),
        loadRestCharacters(campaignId, ids, input.rest !== 'none'),
    ]);

    return {
        map,
        marker,
        heroes: byId(heroes),
        positions: [...positions].sort(([a], [b]) => a.localeCompare(b)),
        reveals: byId(reveals),
        characters: byId(characters),
        ...withRestRules(restRules),
    };
}

async function mapTransitionState(
    campaignId: string,
    input: Record<string, unknown>,
    destMapId: string | undefined
) {
    const ids = input.characterIds as string[];

    const heroes = await activePlayerHeroes(campaignId, { id: { in: ids } });

    const positions = await readPositions(ids);

    const [reveals, characters] = destMapId
        ? await Promise.all([
              loadReveals(destMapId, ids),
              loadRestCharacters(campaignId, ids, input.rest !== 'none'),
          ])
        : [[], []];

    return {
        heroes: byId(heroes),
        positions: [...positions].sort(([a], [b]) => a.localeCompare(b)),
        reveals: byId(reveals),
        characters: byId(characters),
    };
}

async function enterState({ campaignId, input, restRules }: StateArgs) {
    const marker = await prisma.worldMarker.findFirst({
        where: { id: String(input.markerId), map: { campaignId } },
        include: { childMap: true },
    });

    if (!marker) throw markerNotFound();

    const state = await mapTransitionState(
        campaignId,
        input,
        marker.childMap?.id
    );

    return { marker, ...state, ...withRestRules(restRules) };
}

async function exitState({ campaignId, input, restRules }: StateArgs) {
    const map = await prisma.worldMap.findFirst({
        where: { id: String(input.mapId), campaignId },
        include: { parentMarker: true },
    });

    if (!map) throw mapNotFound();

    const state = await mapTransitionState(
        campaignId,
        input,
        map.parentMarker?.mapId
    );

    return { map, ...state, ...withRestRules(restRules) };
}

async function restState({ campaignId, input, restRules }: StateArgs) {
    const ids = input.characterIds as string[];

    const [map, heroes, positions] = await Promise.all([
        findMap(campaignId, input.mapId),
        activePlayerHeroes(campaignId, { id: { in: ids } }),
        readPositions(ids),
    ]);

    if (!map) throw mapNotFound();

    const characters = await loadRestCharacters(campaignId, ids, true);

    return {
        map,
        heroes: byId(heroes),
        positions: [...positions].sort(([a], [b]) => a.localeCompare(b)),
        characters: byId(characters),
        ...withRestRules(restRules),
    };
}

const WORLD_STATE: Record<WorldOperation, (args: StateArgs) => Promise<unknown>> =
    {
        'maps.create': mapsCreateState,
        'maps.update': mapsUpdateState,
        'maps.delete': mapsDeleteState,
        'markers.create': markersCreateState,
        'markers.update': markerMutationState,
        'markers.delete': markerMutationState,
        'notes.create': notesCreateState,
        'notes.update': noteMutationState,
        'notes.delete': noteMutationState,
        travel: travelState,
        enter: enterState,
        exit: exitState,
        rest: restState,
    };

async function worldState(
    caller: AssistantCaller,
    operation: WorldOperation,
    input: Record<string, unknown>
) {
    const campaignId = getCampaignId(caller);

    const restRules = await loadRestRules(campaignId, operation, input);

    return WORLD_STATE[operation]({
        caller,
        campaignId,
        operation,
        input,
        restRules,
    });
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

type WriteArgs = {
    ctx: ActionExecutionContext;
    campaignId: string;
    input: Record<string, unknown>;
    before: unknown;
    emitWorldChanged: (mapId: string | null) => void;
};

type WriteResult = { data: unknown; affected: TargetRef[] };

const mapRef = (row: { id: string; name: string }): TargetRef => ({
    domain: 'world-map',
    id: row.id,
    name: row.name,
});

const markerRef = (row: { id: string; name: string }): TargetRef => ({
    domain: 'world-marker',
    id: row.id,
    name: row.name,
});

const noteRef = (id: string): TargetRef => ({
    domain: 'world-note',
    id,
    name: 'World note',
});

async function assertCanCreateMap(
    campaignId: string,
    body: z.infer<typeof createWorldMapSchema>
) {
    if (!ownedWorldMapPath(campaignId, body.imageUrl))
        throw new ContentError(API_ERRORS.WORLD_IMAGE_FOREIGN, 400);

    if (
        (await prisma.worldMap.count({ where: { campaignId } })) >=
        MAX_WORLD_MAPS
    )
        throw new ContentError(API_ERRORS.WORLD_MAPS_LIMIT, 409);

    if (body.parentMarkerId) {
        const parent = await requireOwnedMarker(campaignId, body.parentMarkerId);

        if (!parent || parent.childMap)
            throw new ContentError(API_ERRORS.WORLD_NESTED_EXISTS, 409);
    } else if (
        await prisma.worldMap.findFirst({
            where: { campaignId, parentMarkerId: null },
            select: { id: true },
        })
    )
        throw new ContentError(API_ERRORS.WORLD_ROOT_EXISTS, 409);
}

async function writeMapsCreate({
    campaignId,
    input,
    emitWorldChanged,
}: WriteArgs): Promise<WriteResult> {
    const body = createWorldMapSchema.parse(input);

    await assertCanCreateMap(campaignId, body);

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

    emitWorldChanged(row.id);

    return { data: toWorldMap(row), affected: [mapRef(row)] };
}

async function writeMapsUpdate({
    ctx,
    campaignId,
    input,
    emitWorldChanged,
}: WriteArgs): Promise<WriteResult> {
    const body = input.patch as Record<string, unknown>;

    const old = await requireOwnedMap(campaignId, String(input.mapId));

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

    if (
        newImage &&
        (await prisma.worldMap.count({
            where: { campaignId, imageUrl: old.imageUrl },
        })) === 0
    )
        ctx.afterCommit({
            key: `world-file:${ctx.intentId}`,
            kind: 'media-cleanup',
            payload: jsonContent({ campaignId, worldMapUrls: [old.imageUrl] }),
        });

    emitWorldChanged(row.id);

    return { data: toWorldMap(row), affected: [mapRef(row)] };
}

async function writeMapsDelete({
    ctx,
    campaignId,
    input,
    before,
    emitWorldChanged,
}: WriteArgs): Promise<WriteResult> {
    const id = String(input.mapId);

    const {
        targets: gone,
        files,
        row: old,
    } = before as TargetsState & { row: { name: string } };

    await prisma.worldMap.delete({ where: { id } });
    ctx.afterCommit({
        key: `world-delete:${ctx.intentId}`,
        kind: 'world-delete',
        payload: jsonContent({ campaignId, ...gone, files }),
    });
    emitWorldChanged(null);

    return {
        data: { ok: true, removed: gone.mapIds.length },
        affected: [mapRef({ id, name: old.name })],
    };
}

async function writeMarkersCreate({
    campaignId,
    input,
    emitWorldChanged,
}: WriteArgs): Promise<WriteResult> {
    const body = createWorldMarkerSchema.parse(input);

    await requireOwnedMap(campaignId, body.mapId);

    const zone = body.kind === 'zone' && body.polygon ? body.polygon : null;

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

    emitWorldChanged(body.mapId);

    return { data: toWorldMarker(row), affected: [markerRef(row)] };
}

function markerUpdateData(
    owned: { kind: string },
    body: z.infer<typeof updateWorldMarkerSchema>
): Prisma.WorldMarkerUpdateInput {
    const { x, y, polygon, ...rest } = body;

    const update: Prisma.WorldMarkerUpdateInput = { ...rest };

    if (owned.kind === 'zone') {
        if (polygon === null)
            throw new ContentError(API_ERRORS.WORLD_POLYGON_INVALID, 400);

        if (polygon)
            Object.assign(update, { polygon, ...polygonCentroid(polygon) });
    } else if (polygon !== undefined)
        throw new ContentError(API_ERRORS.WORLD_POLYGON_INVALID, 400);
    else {
        if (x !== undefined) update.x = x;

        if (y !== undefined) update.y = y;
    }

    return update;
}

async function writeMarkersUpdate({
    campaignId,
    input,
    emitWorldChanged,
}: WriteArgs): Promise<WriteResult> {
    const id = String(input.markerId);

    const body = updateWorldMarkerSchema.parse(input.patch);

    const owned = await prisma.worldMarker.findFirst({
        where: { id, map: { campaignId } },
    });

    if (!owned) throw markerNotFound();

    const row = await prisma.worldMarker.update({
        where: { id },
        data: markerUpdateData(owned, body),
        include: { childMap: { select: { id: true } } },
    });

    emitWorldChanged(owned.mapId);

    return {
        data: toWorldMarker(row),
        affected: [markerRef({ id, name: row.name })],
    };
}

async function writeMarkersDelete({
    ctx,
    campaignId,
    input,
    before,
    emitWorldChanged,
}: WriteArgs): Promise<WriteResult> {
    const id = String(input.markerId);

    const marker = await prisma.worldMarker.findFirst({
        where: { id, map: { campaignId } },
        include: { childMap: { select: { id: true } } },
    });

    if (!marker) throw markerNotFound();

    const oldState = before as Partial<TargetsState>;

    const gone = oldState.targets ?? { mapIds: [], markerIds: [] };

    await prisma.worldMarker.delete({ where: { id } });
    ctx.afterCommit({
        key: `world-delete:${ctx.intentId}`,
        kind: 'world-delete',
        payload: jsonContent({
            campaignId,
            mapIds: gone.mapIds,
            markerIds: [id, ...gone.markerIds],
            files: oldState.files ?? [],
        }),
    });
    emitWorldChanged(marker.mapId);

    return { data: { ok: true }, affected: [markerRef(marker)] };
}

async function writeNotesCreate({
    ctx,
    campaignId,
    input,
    emitWorldChanged,
}: WriteArgs): Promise<WriteResult> {
    const body = createPublicWorldNoteSchema.parse(input);

    const marker = await requireOwnedMarker(campaignId, body.markerId);

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

    emitWorldChanged(marker.mapId);

    return {
        data: toNote(row, ctx.caller.actor.userId),
        affected: [noteRef(row.id)],
    };
}

async function writeNotesUpdate({
    ctx,
    campaignId,
    input,
    emitWorldChanged,
}: WriteArgs): Promise<WriteResult> {
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

    emitWorldChanged(row.marker.mapId);

    return {
        data: toNote(updated, ctx.caller.actor.userId),
        affected: [noteRef(id)],
    };
}

async function writeNotesDelete({
    ctx,
    campaignId,
    input,
    emitWorldChanged,
}: WriteArgs): Promise<WriteResult> {
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

    if (row.visibility === 'public') emitWorldChanged(row.marker.mapId);

    return { data: { ok: true }, affected: [noteRef(id)] };
}

const WORLD_WRITERS: Partial<
    Record<WorldOperation, (args: WriteArgs) => Promise<WriteResult>>
> = {
    'maps.create': writeMapsCreate,
    'maps.update': writeMapsUpdate,
    'maps.delete': writeMapsDelete,
    'markers.create': writeMarkersCreate,
    'markers.update': writeMarkersUpdate,
    'markers.delete': writeMarkersDelete,
    'notes.create': writeNotesCreate,
    'notes.update': writeNotesUpdate,
    'notes.delete': writeNotesDelete,
};

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

    const emitWorldChanged = (mapId: string | null) =>
        ctx.afterCommit({
            key: `world-event:${ctx.intentId}`,
            kind: 'world-changed',
            payload: jsonContent({ campaignId, mapId }),
        });

    const write = WORLD_WRITERS[operation];

    if (write) {
        const { data, affected } = await write({
            ctx,
            campaignId,
            input,
            before,
            emitWorldChanged,
        });

        return { data: jsonContent(data), affected, warnings: [] };
    }

    const access = await dmAccess(ctx.caller);

    const result = await runTravelOperation(access, operation, input);

    if (result.mapId) emitWorldChanged(result.mapId);

    return {
        data: jsonContent(result.data),
        affected: result.affected,
        warnings: [],
    };
}

type TravelResult = {
    data: unknown;
    affected: TargetRef[];
    mapId: string | null;
};

type TravelArgs = {
    access: CampaignAccessResult;
    campaignId: string;
    input: Record<string, unknown>;
    ids: string[];
    heroes: Awaited<ReturnType<typeof activePlayerHeroes>>;
    positions: Awaited<ReturnType<typeof readPositions>>;
};

const heroTargets = (heroes: TravelArgs['heroes']): TargetRef[] =>
    heroes.map((h) => ({ domain: 'character', id: h.id, name: h.name }));

function travelOutcome(
    args: TravelArgs,
    destMapId: string,
    plan: { moves: { characterId: string; to: { x: number; y: number } }[] }
): TravelResult {
    const at = new Map(
        plan.moves.map((m) => [
            m.characterId,
            { mapId: destMapId, x: m.to.x, y: m.to.y },
        ])
    );

    return {
        data: {
            ok: true,
            positions: toDmHeroes(args.heroes, (id) => at.get(id)),
        },
        affected: heroTargets(args.heroes),
        mapId: destMapId,
    };
}

async function runRest(args: TravelArgs): Promise<TravelResult> {
    const { access, campaignId, input, ids, heroes, positions } = args;

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
        affected: heroTargets(heroes),
        mapId: applied ? map.id : null,
    };
}

async function runTravel(args: TravelArgs): Promise<TravelResult> {
    const { access, campaignId, input, ids, positions } = args;

    const body = travelSchema.parse(input);

    const map = await prisma.worldMap.findFirst({
        where: { id: body.mapId, campaignId },
    });

    if (!map) throw mapNotFound();

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

    return travelOutcome(args, map.id, plan);
}

async function runEnter(args: TravelArgs): Promise<TravelResult> {
    const { access, campaignId, input, ids, positions } = args;

    const body = enterSchema.parse(input);

    const marker = await requireOwnedMarker(campaignId, body.markerId);

    const child = marker.childMap
        ? await prisma.worldMap.findUnique({
              where: { id: marker.childMap.id },
          })
        : null;

    if (!child) throw new ContentError(API_ERRORS.WORLD_MARKER_NO_CHILD, 409);

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

    return travelOutcome(args, child.id, plan);
}

async function runExit(args: TravelArgs): Promise<TravelResult> {
    const { access, campaignId, input, ids, positions } = args;

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

    if (!dest) throw mapNotFound();

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

    return travelOutcome(args, dest.id, plan);
}

const TRAVEL_RUNNERS: Partial<
    Record<WorldOperation, (args: TravelArgs) => Promise<TravelResult>>
> = { rest: runRest, travel: runTravel, enter: runEnter, exit: runExit };

async function runTravelOperation(
    access: CampaignAccessResult,
    operation: WorldOperation,
    input: Record<string, unknown>
): Promise<TravelResult> {
    const campaignId = access.campaign.id;

    const ids = input.characterIds as string[];

    const heroes = await activePlayerHeroes(campaignId, { id: { in: ids } });

    if (heroes.length !== ids.length)
        throw new ContentError(API_ERRORS.WORLD_HERO_INVALID, 400);

    const positions = await readPositions(ids);

    const run = TRAVEL_RUNNERS[operation];

    if (!run) throw new Error(`Unsupported world operation: ${operation}`);

    return run({
        access,
        campaignId,
        input,
        ids,
        heroes,
        positions,
    });
}
