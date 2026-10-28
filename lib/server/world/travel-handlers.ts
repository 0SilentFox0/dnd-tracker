import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { TRAVEL_LOG_LIMIT } from "@/lib/constants/world";
import { prisma } from "@/lib/db";
import { enterSchema, exitSchema, travelSchema } from "@/lib/schemas/world";
import { ownedMap, ownedMarker } from "@/lib/server/world/map-handlers";
import { activePlayerHeroes, commitTravel, readPositions, readTravelLog, toDmHeroes } from "@/lib/server/world/travel-store";
import { publishWorldChanged } from "@/lib/server/world/world-events";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { withDM } from "@/lib/utils/api/as-dm";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import { planEnter, planExit, planTravel, type TravelPlan } from "@/lib/utils/world/travel";
import type { WorldHero } from "@/types/world";

type Heroes = { id: string; name: string; avatar: string | null }[];

async function validHeroes(campaignId: string, ids: string[]): Promise<Heroes | NextResponse> {
  const heroes = await activePlayerHeroes(campaignId, { id: { in: ids } });

  return heroes.length === ids.length ? heroes : errorResponse(API_ERRORS.WORLD_HERO_INVALID, 400);
}

function respond(heroes: Heroes, plan: TravelPlan, mapId: string): NextResponse {
  const at = new Map(plan.moves.map((m) => [m.characterId, { mapId, x: m.to.x, y: m.to.y }]));

  const positions: WorldHero[] = toDmHeroes(heroes, (id) => at.get(id));

  return NextResponse.json({ ok: true, positions });
}

export function travelHandler(req: Request, campaignId: string) {
  return withDM(campaignId, "world travel", async (access) => {
    const body = await parseBody(travelSchema, req);

    if (body instanceof NextResponse) return body;

    const map = await ownedMap(campaignId, body.mapId);

    if (map instanceof NextResponse) return map;

    const heroes = await validHeroes(campaignId, body.characterIds);

    if (heroes instanceof NextResponse) return heroes;

    const marker = body.toMarkerId ? await prisma.worldMarker.findFirst({ where: { id: body.toMarkerId, mapId: map.id }, select: { id: true } }) : null;

    const positions = await readPositions(body.characterIds);

    const plan = planTravel({ positions, characterIds: body.characterIds, mapId: map.id, to: body.to, radius: map.revealRadius, aspect: map.width / map.height });

    await commitTravel({ campaignId, userId: access.userId, dest: map, plan, positions, rest: body.rest, toMarkerId: marker?.id ?? null, kind: "travel" });

    publishWorldChanged(campaignId, map.id);

    return respond(heroes, plan, map.id);
  });
}

export function enterHandler(req: Request, campaignId: string) {
  return withDM(campaignId, "world enter", async (access) => {
    const body = await parseBody(enterSchema, req);

    if (body instanceof NextResponse) return body;

    const marker = await ownedMarker(campaignId, body.markerId);

    if (marker instanceof NextResponse) return marker;

    const child = marker.childMap ? await prisma.worldMap.findUnique({ where: { id: marker.childMap.id } }) : null;

    if (!child) return errorResponse(API_ERRORS.WORLD_MARKER_NO_CHILD, 409);

    const heroes = await validHeroes(campaignId, body.characterIds);

    if (heroes instanceof NextResponse) return heroes;

    const positions = await readPositions(body.characterIds);

    const plan = planEnter({ marker, childMap: child, characterIds: body.characterIds });

    await commitTravel({ campaignId, userId: access.userId, dest: child, plan, positions, rest: body.rest, toMarkerId: null, kind: "enter" });

    publishWorldChanged(campaignId, child.id);

    return respond(heroes, plan, child.id);
  });
}

export function exitHandler(req: Request, campaignId: string) {
  return withDM(campaignId, "world exit", async (access) => {
    const body = await parseBody(exitSchema, req);

    if (body instanceof NextResponse) return body;

    const map = await ownedMap(campaignId, body.mapId);

    if (map instanceof NextResponse) return map;

    const parentMarker = map.parentMarkerId ? await prisma.worldMarker.findUnique({ where: { id: map.parentMarkerId }, select: { id: true, mapId: true, x: true, y: true } }) : null;

    if (!parentMarker) return errorResponse(API_ERRORS.WORLD_NOT_NESTED, 409);

    const heroes = await validHeroes(campaignId, body.characterIds);

    if (heroes instanceof NextResponse) return heroes;

    const positions = await readPositions(body.characterIds);

    if (body.characterIds.some((id) => positions.get(id)?.mapId !== map.id)) return errorResponse(API_ERRORS.WORLD_HERO_INVALID, 400);

    const dest = await prisma.worldMap.findUnique({ where: { id: parentMarker.mapId } });

    if (!dest) return errorResponse(API_ERRORS.WORLD_MAP_NOT_FOUND, 404);

    const plan = planExit({ map: { id: map.id, parentMarker }, characterIds: body.characterIds });

    await commitTravel({ campaignId, userId: access.userId, dest, plan, positions, rest: body.rest, toMarkerId: parentMarker.id, kind: "exit" });

    publishWorldChanged(campaignId, dest.id);

    return respond(heroes, plan, dest.id);
  });
}

export async function logHandler(campaignId: string) {
  try {
    const access = await requireCampaignAccess(campaignId);

    if (access instanceof NextResponse) return access;

    if (access.isDM) return NextResponse.json(await readTravelLog(campaignId, TRAVEL_LOG_LIMIT));

    const mine = await activePlayerHeroes(campaignId, { controlledBy: access.userId });

    if (mine.length === 0) return NextResponse.json([]);

    return NextResponse.json(await readTravelLog(campaignId, TRAVEL_LOG_LIMIT, mine.map((h) => h.id)));
  } catch (error) {
    return handleApiError(error, { action: "world travel log" });
  }
}
