import type { TargetRef } from '../../types';
import { WorldOperation } from './inputs';
import { requireOwnedMap, requireOwnedMarker } from './prepare';
import { mapNotFound } from './state-common';

import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import {
    enterSchema,
    exitSchema,
    restWorldSchema,
    travelSchema,
} from '@/lib/schemas/world';
import { ContentError } from '@/lib/server/content/errors';
import { applyWorldRest } from '@/lib/server/world/rest';
import {
    activePlayerHeroes,
    commitTravel,
    readPositions,
    toDmHeroes,
    writeRestLog,
} from '@/lib/server/world/travel-store';
import { travelToPoint } from '@/lib/server/world/travel-to-point';
import type { CampaignAccessResult } from '@/lib/utils/api/api-auth';
import { planEnter, planExit } from '@/lib/utils/world/travel';

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

    const plan = await travelToPoint({
        campaignId,
        userId: access.userId,
        map,
        body,
        characterIds: ids,
        positions,
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

export async function runTravelOperation(
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
