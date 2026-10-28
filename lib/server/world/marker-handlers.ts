import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { DEFAULT_ZONE_COLOR, MAX_MARKERS_PER_MAP } from "@/lib/constants/world";
import { prisma } from "@/lib/db";
import { createWorldMarkerSchema, updateWorldMarkerSchema } from "@/lib/schemas/world";
import { clearShowAfterDelete, deleteSubtreeWithFiles, ownedMap, ownedMarker, subtreeTargets } from "@/lib/server/world/map-handlers";
import { toWorldMarker } from "@/lib/server/world/map-store";
import { errorResponse } from "@/lib/utils/api/api-response";
import { withDM } from "@/lib/utils/api/as-dm";
import { parseBody } from "@/lib/utils/api/parse-body";
import { polygonCentroid } from "@/lib/utils/world/geometry";

export function createWorldMarkerHandler(req: Request, campaignId: string) {
  return withDM(campaignId, "create world marker", async () => {
    const body = await parseBody(createWorldMarkerSchema, req);

    if (body instanceof NextResponse) return body;

    const map = await ownedMap(campaignId, body.mapId);

    if (map instanceof NextResponse) return map;

    const { _count, _max } = await prisma.worldMarker.aggregate({ where: { mapId: body.mapId }, _count: true, _max: { sortOrder: true } });

    if (_count >= MAX_MARKERS_PER_MAP) return errorResponse(API_ERRORS.WORLD_MARKERS_LIMIT, 409);

    const zone = body.kind === "zone" && body.polygon ? body.polygon : null;

    const { x, y } = zone ? polygonCentroid(zone) : body;

    const created = await prisma.worldMarker.create({
      data: {
        mapId: body.mapId,
        kind: body.kind,
        x,
        y,
        polygon: body.polygon ?? undefined,
        name: body.name,
        icon: body.icon ?? null,
        color: body.color ?? (zone ? DEFAULT_ZONE_COLOR : null),
        sortOrder: (_max.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json(toWorldMarker(created), { status: 201 });
  });
}

export function updateWorldMarkerHandler(req: Request, campaignId: string, markerId: string) {
  return withDM(campaignId, "update world marker", async () => {
    const owned = await ownedMarker(campaignId, markerId);

    if (owned instanceof NextResponse) return owned;

    const body = await parseBody(updateWorldMarkerSchema, req);

    if (body instanceof NextResponse) return body;

    const data: Record<string, unknown> = { ...body };

    if (owned.kind === "zone") {
      if (body.polygon === null) return errorResponse(API_ERRORS.WORLD_POLYGON_INVALID, 400);

      delete data.x;
      delete data.y;

      if (body.polygon) Object.assign(data, polygonCentroid(body.polygon));
    } else if (body.polygon !== undefined) {
      return errorResponse(API_ERRORS.WORLD_POLYGON_INVALID, 400);
    }

    const updated = await prisma.worldMarker.update({ where: { id: markerId }, data, include: { childMap: { select: { id: true } } } });

    return NextResponse.json(toWorldMarker(updated));
  });
}

export function deleteWorldMarkerHandler(campaignId: string, markerId: string) {
  return withDM(campaignId, "delete world marker", async () => {
    const owned = await ownedMarker(campaignId, markerId);

    if (owned instanceof NextResponse) return owned;

    const remove = () => prisma.worldMarker.delete({ where: { id: markerId } });

    const child = owned.childMap ? await subtreeTargets(campaignId, owned.childMap.id) : { mapIds: [], markerIds: [] };

    if (owned.childMap) await deleteSubtreeWithFiles(campaignId, owned.childMap.id, remove);
    else await remove();

    clearShowAfterDelete(campaignId, { mapIds: child.mapIds, markerIds: [markerId, ...child.markerIds] });

    return NextResponse.json({ ok: true });
  });
}
