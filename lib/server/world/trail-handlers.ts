import { NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { TRAIL_ENTRY_LIMIT } from '@/lib/constants/world';
import { prisma } from '@/lib/db';
import { worldTrailQuerySchema } from '@/lib/schemas/world';
import { listSessions } from '@/lib/server/world/session-store';
import { activePlayerHeroes } from '@/lib/server/world/travel-store';
import { readViewerScope } from '@/lib/server/world/view-handlers';
import { requireCampaignAccess } from '@/lib/utils/api/api-auth';
import { errorResponse } from '@/lib/utils/api/api-response';
import { handleApiError } from '@/lib/utils/api/error-handler';
import { filterTrailForViewer, type TrailRow } from '@/lib/utils/world/trail';
import {
    type MapPoint,
    type TrailEntry,
    TRAVEL_KINDS,
    type TravelKind,
    type WorldTrailData,
} from '@/types/world';

type StoredPoint = { mapId?: string; x: number; y: number };

const samePoint = (p: StoredPoint | null, mapId: string): MapPoint | null =>
    p && p.mapId === mapId ? { x: p.x, y: p.y } : null;

const toKind = (kind: string): TravelKind =>
    (TRAVEL_KINDS as readonly string[]).includes(kind)
        ? (kind as TravelKind)
        : 'travel';

export async function trailHandler(req: Request, campaignId: string) {
    try {
        const access = await requireCampaignAccess(campaignId, false, {
            allowDemo: true,
        });

        if (access instanceof NextResponse) return access;

        const parsed = worldTrailQuerySchema.safeParse(
            Object.fromEntries(new URL(req.url).searchParams)
        );

        if (!parsed.success)
            return errorResponse(
                API_ERRORS.INVALID_BODY,
                400,
                parsed.error.issues
            );

        const { mapId } = parsed.data;

        const heroes = access.isDM
            ? []
            : await activePlayerHeroes(campaignId, {
                  controlledBy: access.userId,
              });

        const heroIds = heroes.map((h) => h.id);

        const [scope, shown] = await Promise.all([
            readViewerScope(campaignId, heroIds),
            access.isDM
                ? null
                : prisma.campaignShow.findUnique({
                      where: { campaignId },
                      select: { world: true },
                  }),
        ]);

        const allowed =
            access.isDM || access.isDemo
                ? new Set(scope.allMaps.map((m) => m.id))
                : scope.allowed;

        const shownMapId = (
            shown?.world as { mapId?: string } | null | undefined
        )?.mapId;

        if (shownMapId) allowed.add(shownMapId);

        if (!scope.allMaps.some((m) => m.id === mapId) || !allowed.has(mapId))
            return errorResponse(API_ERRORS.WORLD_MAP_NOT_FOUND, 404);

        const ownOnly = !access.isDM;

        if (ownOnly && heroIds.length === 0)
            return NextResponse.json({
                sessions: [],
                entries: [],
            } satisfies WorldTrailData);

        const logRows = (
            await prisma.worldTravelLog.findMany({
                where: {
                    campaignId,
                    mapId,
                    ...(ownOnly ? { characterIds: { hasSome: heroIds } } : {}),
                },
                orderBy: { createdAt: 'desc' },
                take: TRAIL_ENTRY_LIMIT,
            })
        ).reverse();

        const nameIds = ownOnly
            ? heroIds
            : [...new Set(logRows.flatMap((r) => r.characterIds))];

        const named = ownOnly
            ? heroes
            : nameIds.length > 0
              ? await prisma.character.findMany({
                    where: { id: { in: nameIds } },
                    select: { id: true, name: true },
                })
              : [];

        const names = new Map(named.map((c) => [c.id, c.name]));

        const rows: TrailRow[] = logRows.map((r) => ({
            id: r.id,
            sessionId: r.sessionId,
            kind: toKind(r.kind),
            characterIds: r.characterIds,
            names,
            from: samePoint(r.from as StoredPoint | null, mapId),
            to: { x: (r.to as StoredPoint).x, y: (r.to as StoredPoint).y },
            createdAt: r.createdAt,
        }));

        const entries: TrailEntry[] = ownOnly
            ? filterTrailForViewer(rows, new Set(heroIds))
            : rows.map((r) => ({
                  id: r.id,
                  sessionId: r.sessionId,
                  kind: r.kind,
                  heroes: r.characterIds.flatMap((id) =>
                      names.has(id)
                          ? [{ id, name: names.get(id) as string }]
                          : []
                  ),
                  from: r.from,
                  to: r.to,
                  at: r.createdAt.toISOString(),
              }));

        const sessions = await listSessions(campaignId);

        const visible = ownOnly
            ? new Set(
                  entries.flatMap((e) => (e.sessionId ? [e.sessionId] : []))
              )
            : null;

        return NextResponse.json({
            sessions: visible
                ? sessions.filter((s) => visible.has(s.id))
                : sessions,
            entries,
        } satisfies WorldTrailData);
    } catch (error) {
        return handleApiError(error, { action: 'world trail' });
    }
}
