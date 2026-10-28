import { isRevealed, zoneTouchesReveal } from "./geometry";
import { mapPath } from "./tree";

import type { HeroPosition, MapPoint, RevealShape, WorldHero, WorldMap, WorldMapSummary, WorldMarker, WorldNote, WorldView } from "@/types/world";

export type NoteRow = Omit<WorldNote, "mine">;

export type HeroInfo = { name: string; avatar: string | null; controlledBy: string };

export interface WorldViewInput {
  map: WorldMap;
  markers: WorldMarker[];
  allMaps: WorldMapSummary[];
  positions: HeroPosition[];
  heroNames: Map<string, HeroInfo>;
  reveals: { mapId: string; characterId: string; shape: RevealShape }[];
  notes: NoteRow[];
  viewer: { userId: string; heroIds: string[] };
}

function pointOnMap(pos: HeroPosition, mapId: string, byId: Map<string, WorldMapSummary>, markers: WorldMarker[]): MapPoint | null {
  if (pos.mapId === mapId) return { x: pos.x, y: pos.y };

  const seen = new Set<string>();

  for (let cur = byId.get(pos.mapId); cur && !seen.has(cur.id); cur = cur.parentMapId ? byId.get(cur.parentMapId) : undefined) {
    seen.add(cur.id);

    if (cur.parentMapId === mapId) {
      const entry = markers.find((m) => m.id === cur.parentMarkerId);

      return entry ? { x: entry.x, y: entry.y } : null;
    }
  }

  return null;
}

export function buildWorldView(input: WorldViewInput): WorldView {
  const { map, allMaps, viewer } = input;

  const own = new Set(viewer.heroIds);

  const fog = map.fogEnabled;

  const aspect = map.width / map.height;

  const byId = new Map(allMaps.map((m) => [m.id, m]));

  const shapes = fog ? input.reveals.filter((r) => r.mapId === map.id && own.has(r.characterId)).map((r) => r.shape) : [];

  const visible = (p: MapPoint) => !fog || isRevealed(p, shapes, map.revealRadius, aspect);

  const markers = input.markers
    .filter((m) => {
      if (!fog || m.alwaysVisible) return true;

      return visible({ x: m.x, y: m.y }) || (m.kind === "zone" && !!m.polygon && zoneTouchesReveal(m.polygon, shapes, map.revealRadius, aspect));
    })
    .map((m) => ({ ...m, dmNote: null }));

  const heroes: WorldHero[] = [];

  for (const pos of input.positions) {
    const info = input.heroNames.get(pos.characterId);

    const at = info ? pointOnMap(pos, map.id, byId, input.markers) : null;

    if (!info || !at) continue;

    const isOwn = own.has(pos.characterId);

    if (isOwn || visible(at)) heroes.push({ id: pos.characterId, name: info.name, avatar: info.avatar, mapId: map.id, x: at.x, y: at.y, own: isOwn });
  }

  const known = new Set<string>([map.id]);

  for (const pos of input.positions) if (own.has(pos.characterId)) known.add(pos.mapId);

  for (const r of input.reveals) if (own.has(r.characterId)) known.add(r.mapId);

  const withPath = new Set<string>();

  for (const id of known) for (const m of mapPath(allMaps, id)) withPath.add(m.id);

  const markerIds = new Set(markers.map((m) => m.id));

  const notes: WorldNote[] = input.notes
    .filter((n) => markerIds.has(n.markerId) && (n.visibility === "public" || n.authorUserId === viewer.userId))
    .map((n) => ({ ...n, mine: n.authorUserId === viewer.userId }));

  return {
    map,
    markers,
    heroes,
    reveals: shapes,
    maps: allMaps.filter((m) => withPath.has(m.id)),
    notes,
    fog,
  };
}
