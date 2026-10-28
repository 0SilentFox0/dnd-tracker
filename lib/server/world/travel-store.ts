import { CharacterStatus, CharacterType } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { listWorldMaps } from "@/lib/server/world/map-store";
import { dedupePoint, type HeroPos, type TravelPlan } from "@/lib/utils/world/travel";
import { type RevealShape, TRAVEL_KINDS, type TravelKind, type TravelRest, type WorldHero, type WorldTravelEntry } from "@/types/world";

type HeroRow = { id: string; name: string; avatar: string | null };

export const activePlayerHeroes = (campaignId: string, where: { id?: { in: string[] }; controlledBy?: string } = {}) =>
  prisma.character.findMany({ where: { campaignId, type: CharacterType.PLAYER, status: CharacterStatus.ACTIVE, ...where }, select: { id: true, name: true, avatar: true, controlledBy: true } });

export async function readPositions(characterIds: string[]): Promise<Map<string, HeroPos>> {
  const rows = await prisma.worldPosition.findMany({ where: { characterId: { in: characterIds } } });

  return new Map(rows.map((r) => [r.characterId, { characterId: r.characterId, mapId: r.mapId, x: r.x, y: r.y }]));
}

export const toDmHeroes = (heroes: HeroRow[], at: (id: string) => { mapId: string; x: number; y: number } | undefined): WorldHero[] =>
  heroes.flatMap((h) => {
    const pos = at(h.id);

    return pos ? [{ id: h.id, name: h.name, avatar: h.avatar, mapId: pos.mapId, x: pos.x, y: pos.y, own: true }] : [];
  });

export async function listHeroesOnMap(campaignId: string, mapId: string): Promise<WorldHero[]> {
  const positions = await prisma.worldPosition.findMany({ where: { campaignId, mapId } });

  if (positions.length === 0) return [];

  const heroes = await activePlayerHeroes(campaignId, { id: { in: positions.map((p) => p.characterId) } });

  const byId = new Map(positions.map((p) => [p.characterId, p]));

  return toDmHeroes(heroes, (id) => byId.get(id));
}

type DestMap = { id: string; revealRadius: number; width: number; height: number };

export async function commitTravel(args: {
  campaignId: string;
  userId: string;
  dest: DestMap;
  plan: TravelPlan;
  positions: Map<string, HeroPos>;
  rest: TravelRest;
  toMarkerId: string | null;
  kind: TravelKind;
}): Promise<void> {
  const { campaignId, dest, plan } = args;

  const existing = await prisma.worldReveal.findMany({ where: { mapId: dest.id, characterId: { in: plan.moves.map((m) => m.characterId) } }, select: { characterId: true, shape: true } });

  const shapesOf = (characterId: string) => existing.filter((r) => r.characterId === characterId).map((r) => r.shape as RevealShape);

  const aspect = dest.width / dest.height;

  const reveals = plan.reveals.filter((r) => r.shape.t !== "p" || !dedupePoint(shapesOf(r.characterId), { x: r.shape.x, y: r.shape.y }, aspect));

  const first = plan.moves[0];

  const from = first ? args.positions.get(first.characterId) : null;

  await prisma.$transaction([
    ...plan.moves.map((m) =>
      prisma.worldPosition.upsert({
        where: { characterId: m.characterId },
        create: { characterId: m.characterId, campaignId, mapId: dest.id, x: m.to.x, y: m.to.y },
        update: { mapId: dest.id, x: m.to.x, y: m.to.y },
      }),
    ),
    prisma.worldReveal.createMany({ data: reveals.map((r) => ({ mapId: dest.id, characterId: r.characterId, shape: r.shape })) }),
    prisma.worldTravelLog.create({
      data: {
        campaignId,
        mapId: dest.id,
        characterIds: plan.moves.map((m) => m.characterId),
        from: from ? { mapId: from.mapId, x: from.x, y: from.y } : undefined,
        to: { mapId: dest.id, x: first.to.x, y: first.to.y },
        toMarkerId: args.toMarkerId,
        rest: args.rest,
        kind: args.kind,
        byUserId: args.userId,
      },
    }),
  ]);
}

export async function writeRestLog(args: { campaignId: string; userId: string; mapId: string; kind: Exclude<TravelRest, "none">; characterIds: string[]; at: { x: number; y: number } }): Promise<void> {
  const { mapId, at } = args;

  await prisma.worldTravelLog.create({
    data: { campaignId: args.campaignId, mapId, characterIds: args.characterIds, from: { mapId, ...at }, to: { mapId, ...at }, toMarkerId: null, rest: args.kind, kind: "rest", byUserId: args.userId },
  });
}

export async function readTravelLog(campaignId: string, limit: number, heroIds?: string[]): Promise<WorldTravelEntry[]> {
  const rows = await prisma.worldTravelLog.findMany({
    where: { campaignId, ...(heroIds ? { characterIds: { hasSome: heroIds } } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  if (rows.length === 0) return [];

  const allowed = heroIds ? new Set(heroIds) : null;

  const characterIds = [...new Set(rows.flatMap((r) => r.characterIds).filter((id) => !allowed || allowed.has(id)))];

  const markerIds = [...new Set(rows.flatMap((r) => (r.toMarkerId ? [r.toMarkerId] : [])))];

  const [characters, markers, maps] = await Promise.all([
    prisma.character.findMany({ where: { id: { in: characterIds } }, select: { id: true, name: true } }),
    prisma.worldMarker.findMany({ where: { id: { in: markerIds } }, select: { id: true, name: true } }),
    listWorldMaps(campaignId),
  ]);

  const names = new Map(characters.map((c) => [c.id, c.name]));

  const markerNames = new Map(markers.map((m) => [m.id, m.name]));

  const mapNames = new Map(maps.map((m) => [m.id, m.name]));

  return rows.map((r) => ({
    id: r.id,
    mapId: r.mapId,
    mapName: mapNames.get(r.mapId) ?? "",
    heroes: r.characterIds.flatMap((id) => (names.has(id) && (!allowed || allowed.has(id)) ? [{ id, name: names.get(id) as string }] : [])),
    from: heroIds ? null : (r.from as WorldTravelEntry["from"]),
    to: r.to as WorldTravelEntry["to"],
    toMarkerName: r.toMarkerId ? (markerNames.get(r.toMarkerId) ?? null) : null,
    rest: r.rest as TravelRest,
    kind: (TRAVEL_KINDS as readonly string[]).includes(r.kind) ? (r.kind as TravelKind) : "travel",
    createdAt: r.createdAt.toISOString(),
  }));
}
