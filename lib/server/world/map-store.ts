import type { WorldMap as WorldMapRow, WorldMarker as WorldMarkerRow } from "@prisma/client";

import { prisma } from "@/lib/db";
import { subtreeMapIds } from "@/lib/utils/world/tree";
import type { Polygon, WorldMap, WorldMapDetail, WorldMapSummary, WorldMarker } from "@/types/world";

type MapRow = WorldMapRow & { parentMarker?: { mapId: string } | null };
type MarkerRow = WorldMarkerRow & { childMap?: { id: string } | null };

export const toWorldMap = (row: MapRow): WorldMap => ({
  id: row.id,
  name: row.name,
  parentMarkerId: row.parentMarkerId,
  parentMapId: row.parentMarker?.mapId ?? null,
  imageUrl: row.imageUrl,
  width: row.width,
  height: row.height,
  fogEnabled: row.fogEnabled,
  revealRadius: row.revealRadius,
  entryX: row.entryX,
  entryY: row.entryY,
  updatedAt: row.updatedAt.toISOString(),
});

export const toWorldMarker = (row: MarkerRow): WorldMarker => ({
  id: row.id,
  mapId: row.mapId,
  kind: row.kind === "zone" ? "zone" : "point",
  x: row.x,
  y: row.y,
  polygon: (row.polygon as Polygon | null) ?? null,
  name: row.name,
  icon: row.icon,
  color: row.color,
  dmNote: row.dmNote,
  alwaysVisible: row.alwaysVisible,
  sortOrder: row.sortOrder,
  childMapId: row.childMap?.id ?? null,
});

const toSummary = ({ id, name, parentMarkerId, parentMapId, imageUrl, width, height }: WorldMap): WorldMapSummary => ({ id, name, parentMarkerId, parentMapId, imageUrl, width, height });

export async function listWorldMaps(campaignId: string): Promise<WorldMapSummary[]> {
  const rows = await prisma.worldMap.findMany({ where: { campaignId }, include: { parentMarker: { select: { mapId: true } } }, orderBy: { createdAt: "asc" } });

  return rows.map((row) => toSummary(toWorldMap(row)));
}

export async function readWorldMapDetail(mapId: string): Promise<(WorldMapDetail & { campaignId: string }) | null> {
  const row = await prisma.worldMap.findUnique({
    where: { id: mapId },
    include: { parentMarker: { select: { mapId: true } }, markers: { include: { childMap: { select: { id: true } } }, orderBy: { sortOrder: "asc" } } },
  });

  if (!row) return null;

  return { campaignId: row.campaignId, map: toWorldMap(row), markers: row.markers.map(toWorldMarker) };
}

/** imageUrl піддерева `rootMapId`, що не використовуються картами поза ним. */
export async function orphanedImagesOfSubtree(campaignId: string, rootMapId: string): Promise<string[]> {
  const rows = await prisma.worldMap.findMany({ where: { campaignId }, select: { id: true, imageUrl: true, parentMarker: { select: { mapId: true } } } });

  const inTree = new Set(subtreeMapIds(rows.map((r) => ({ id: r.id, parentMapId: r.parentMarker?.mapId ?? null })), rootMapId));

  const usedOutside = new Set(rows.filter((r) => !inTree.has(r.id)).map((r) => r.imageUrl));

  return [...new Set(rows.filter((r) => inTree.has(r.id) && !usedOutside.has(r.imageUrl)).map((r) => r.imageUrl))];
}
