import type { WorldMapSummary } from "@/types/world";

export function mapPath(maps: WorldMapSummary[], mapId: string): WorldMapSummary[] {
  const byId = new Map(maps.map((m) => [m.id, m]));

  const path: WorldMapSummary[] = [];

  const seen = new Set<string>();

  for (let cur = byId.get(mapId); cur && !seen.has(cur.id); cur = cur.parentMapId ? byId.get(cur.parentMapId) : undefined) {
    seen.add(cur.id);
    path.unshift(cur);
  }

  return path;
}

export function subtreeMapIds(maps: Pick<WorldMapSummary, "id" | "parentMapId">[], rootId: string): string[] {
  const ids = [rootId];

  const seen = new Set(ids);

  for (let i = 0; i < ids.length; i++) {
    for (const m of maps) {
      if (m.parentMapId === ids[i] && !seen.has(m.id)) {
        seen.add(m.id);
        ids.push(m.id);
      }
    }
  }

  return ids;
}
