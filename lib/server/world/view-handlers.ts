import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { worldViewQuerySchema } from "@/lib/schemas/world";
import { listWorldMaps, readWorldMapDetail } from "@/lib/server/world/map-store";
import { activePlayerHeroes } from "@/lib/server/world/travel-store";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { buildWorldView, type HeroInfo, knownMapIds, type NoteRow } from "@/lib/utils/world/player-view";
import type { HeroPosition, RevealShape } from "@/types/world";

const viewQuery = worldViewQuerySchema.partial({ mapId: true });

export async function readViewerScope(campaignId: string, heroIds: string[]) {
  const [allMaps, positionRows, revealRows] = await Promise.all([
    listWorldMaps(campaignId),
    prisma.worldPosition.findMany({ where: { campaignId } }),
    heroIds.length > 0 ? prisma.worldReveal.findMany({ where: { characterId: { in: heroIds } }, select: { mapId: true, characterId: true, shape: true } }) : [],
  ]);

  const positions: HeroPosition[] = positionRows.map((p) => ({ characterId: p.characterId, mapId: p.mapId, x: p.x, y: p.y }));

  const reveals = revealRows.map((r) => ({ mapId: r.mapId, characterId: r.characterId, shape: r.shape as RevealShape }));

  const root = allMaps.find((m) => !m.parentMarkerId);

  return { allMaps, positions, reveals, root, allowed: knownMapIds(allMaps, heroIds, positions, reveals, root?.id) };
}

export async function viewHandler(req: Request, campaignId: string) {
  try {
    const access = await requireCampaignAccess(campaignId);

    if (access instanceof NextResponse) return access;

    const parsed = viewQuery.safeParse(Object.fromEntries(new URL(req.url).searchParams));

    if (!parsed.success) return errorResponse(API_ERRORS.INVALID_BODY, 400, parsed.error.issues);

    const { mapId, asHeroId } = parsed.data;

    if (asHeroId && !access.isDM) return errorResponse(API_ERRORS.WORLD_AS_HERO_DM_ONLY, 403);

    if (access.isDM && !asHeroId) return errorResponse(API_ERRORS.INVALID_BODY, 400);

    const asHero = !!asHeroId;

    const heroes = await activePlayerHeroes(campaignId, asHeroId ? { id: { in: [asHeroId] } } : { controlledBy: access.userId });

    if (asHero && heroes.length === 0) return errorResponse(API_ERRORS.WORLD_HERO_INVALID, 400);

    const heroIds = heroes.map((h) => h.id);

    const [{ allMaps, positions, reveals, root, allowed: known }, shown] = await Promise.all([
      readViewerScope(campaignId, heroIds),
      access.isDM ? null : prisma.campaignShow.findUnique({ where: { campaignId }, select: { world: true } }),
    ]);

    const allowed = asHero ? new Set(allMaps.map((m) => m.id)) : known;

    const shownMapId = (shown?.world as { mapId?: string } | null | undefined)?.mapId;

    if (shownMapId) allowed.add(shownMapId);

    const heroMap = positions.find((p) => heroIds.includes(p.characterId))?.mapId;

    const target = mapId ?? (heroMap && allowed.has(heroMap) ? heroMap : (root ?? allMaps[0])?.id);

    if (!target || !allMaps.some((m) => m.id === target) || !allowed.has(target)) return errorResponse(API_ERRORS.WORLD_MAP_NOT_FOUND, 404);

    const detail = await readWorldMapDetail(target);

    if (!detail) return errorResponse(API_ERRORS.WORLD_MAP_NOT_FOUND, 404);

    const noteRows = await prisma.worldNote.findMany({
      where: { marker: { mapId: target }, ...(asHero ? { visibility: "public" } : { OR: [{ visibility: "public" }, { authorUserId: access.userId }] }) },
      include: { author: { select: { displayName: true } } },
      orderBy: { createdAt: "asc" },
    });

    const notes: NoteRow[] = noteRows.map((n) => ({
      id: n.id,
      markerId: n.markerId,
      authorUserId: n.authorUserId,
      authorName: n.author.displayName,
      characterId: n.characterId,
      visibility: n.visibility === "private" ? "private" : "public",
      text: n.text,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }));

    const positioned = [...new Set(positions.map((p) => p.characterId))];

    const named = positioned.length > 0 ? await activePlayerHeroes(campaignId, { id: { in: positioned } }) : [];

    const heroNames = new Map<string, HeroInfo>(named.map((c) => [c.id, { name: c.name, avatar: c.avatar, controlledBy: c.controlledBy }]));

    return NextResponse.json(
      buildWorldView({ map: detail.map, markers: detail.markers, allMaps, positions, heroNames, reveals, notes, viewer: { userId: access.userId, heroIds, asHero } }),
    );
  } catch (error) {
    return handleApiError(error, { action: "world view" });
  }
}
