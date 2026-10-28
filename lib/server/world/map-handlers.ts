import { after, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { MAX_WORLD_MAPS } from "@/lib/constants/world";
import { prisma } from "@/lib/db";
import { createWorldMapSchema, updateWorldMapSchema } from "@/lib/schemas/world";
import { listWorldMaps, orphanedImagesOfSubtree, readWorldMapDetail, toWorldMap } from "@/lib/server/world/map-store";
import { listHeroesOnMap } from "@/lib/server/world/travel-store";
import { ownedWorldMapPath, removeWorldMapFiles } from "@/lib/supabase/world-map-storage";
import { errorResponse } from "@/lib/utils/api/api-response";
import { withDM } from "@/lib/utils/api/as-dm";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { parseBody } from "@/lib/utils/api/parse-body";

export const ownedMap = (campaignId: string, mapId: string) => loadOwned(prisma.worldMap.findUnique({ where: { id: mapId } }), campaignId, API_ERRORS.WORLD_MAP_NOT_FOUND);

export const ownedMarker = (campaignId: string, markerId: string) =>
  loadOwned(
    prisma.worldMarker.findUnique({ where: { id: markerId }, include: { map: { select: { campaignId: true } }, childMap: { select: { id: true } } } }).then((m) => m && { ...m, campaignId: m.map.campaignId }),
    campaignId,
    API_ERRORS.WORLD_MARKER_NOT_FOUND,
  );

/** Файли піддерева прибираються лише після успішного видалення рядків. */
export async function deleteSubtreeWithFiles(campaignId: string, rootMapId: string, remove: () => Promise<unknown>) {
  const urls = await orphanedImagesOfSubtree(campaignId, rootMapId);

  await remove();

  if (urls.length > 0) after(() => removeWorldMapFiles(campaignId, urls));
}

export function listWorldMapsHandler(campaignId: string) {
  return withDM(campaignId, "list world maps", async () => NextResponse.json(await listWorldMaps(campaignId)));
}

export function createWorldMapHandler(req: Request, campaignId: string) {
  return withDM(campaignId, "create world map", async () => {
    const body = await parseBody(createWorldMapSchema, req);

    if (body instanceof NextResponse) return body;

    if (!ownedWorldMapPath(campaignId, body.imageUrl)) return errorResponse(API_ERRORS.WORLD_IMAGE_FOREIGN, 400);

    if ((await prisma.worldMap.count({ where: { campaignId } })) >= MAX_WORLD_MAPS) return errorResponse(API_ERRORS.WORLD_MAPS_LIMIT, 409);

    if (body.parentMarkerId) {
      const marker = await ownedMarker(campaignId, body.parentMarkerId);

      if (marker instanceof NextResponse) return marker;

      if (marker.childMap) return errorResponse(API_ERRORS.WORLD_NESTED_EXISTS, 409);
    } else if (await prisma.worldMap.findFirst({ where: { campaignId, parentMarkerId: null }, select: { id: true } })) {
      return errorResponse(API_ERRORS.WORLD_ROOT_EXISTS, 409);
    }

    try {
      const created = await prisma.worldMap.create({
        data: { campaignId, name: body.name, imageUrl: body.imageUrl, width: body.width, height: body.height, parentMarkerId: body.parentMarkerId ?? null },
        include: { parentMarker: { select: { mapId: true } } },
      });

      return NextResponse.json(toWorldMap(created), { status: 201 });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return errorResponse(body.parentMarkerId ? API_ERRORS.WORLD_NESTED_EXISTS : API_ERRORS.WORLD_ROOT_EXISTS, 409);

      throw e;
    }
  });
}

export function getWorldMapHandler(campaignId: string, mapId: string) {
  return withDM(campaignId, "get world map", async () => {
    const owned = await ownedMap(campaignId, mapId);

    if (owned instanceof NextResponse) return owned;

    const detail = await readWorldMapDetail(mapId);

    if (!detail) return errorResponse(API_ERRORS.WORLD_MAP_NOT_FOUND, 404);

    return NextResponse.json({ map: detail.map, markers: detail.markers, heroes: await listHeroesOnMap(campaignId, mapId) });
  });
}

export function updateWorldMapHandler(req: Request, campaignId: string, mapId: string) {
  return withDM(campaignId, "update world map", async () => {
    const owned = await ownedMap(campaignId, mapId);

    if (owned instanceof NextResponse) return owned;

    const body = await parseBody(updateWorldMapSchema, req);

    if (body instanceof NextResponse) return body;

    const newImage = body.imageUrl !== owned.imageUrl ? body.imageUrl : undefined;

    const replacesImage = newImage !== undefined;

    if (newImage !== undefined && !ownedWorldMapPath(campaignId, newImage)) return errorResponse(API_ERRORS.WORLD_IMAGE_FOREIGN, 400);

    const updated = await prisma.worldMap.update({ where: { id: mapId }, data: body, include: { parentMarker: { select: { mapId: true } } } });

    if (replacesImage) {
      const stillUsed = await prisma.worldMap.count({ where: { campaignId, imageUrl: owned.imageUrl } });

      if (stillUsed === 0) after(() => removeWorldMapFiles(campaignId, [owned.imageUrl]));
    }

    return NextResponse.json(toWorldMap(updated));
  });
}

export function deleteWorldMapHandler(campaignId: string, mapId: string) {
  return withDM(campaignId, "delete world map", async () => {
    const owned = await ownedMap(campaignId, mapId);

    if (owned instanceof NextResponse) return owned;

    await deleteSubtreeWithFiles(campaignId, mapId, () => prisma.worldMap.delete({ where: { id: mapId } }));

    return NextResponse.json({ ok: true });
  });
}
