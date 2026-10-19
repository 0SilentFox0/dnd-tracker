import { after, NextResponse } from "next/server";
import type { CampaignTrack as TrackRow } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { MAX_TRACKS_PER_CAMPAIGN } from "@/lib/constants/music";
import { prisma } from "@/lib/db";
import { createTrackSchema, reorderTracksSchema, trackUploadRequestSchema, updateTrackSchema } from "@/lib/schemas/music";
import { createTrackUploadTicket, removeTrackFile, trackPathOwnedBy, verifyUploadedTrack } from "@/lib/supabase/battle-music-storage";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { parseBody } from "@/lib/utils/api/parse-body";
import { validateTrackFile } from "@/lib/utils/audio/track-file";
import { parseYoutubeId } from "@/lib/utils/audio/youtube-id";
import { fetchYoutubeTitle } from "@/lib/utils/audio/youtube-oembed";
import type { CampaignTrack, TrackKind } from "@/types/audio";

const ORDER = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }];

type TrackSource = Pick<TrackRow, "kind" | "title" | "url" | "youtubeId" | "durationSec">;

export function toCampaignTrack(row: TrackRow): CampaignTrack {
  return { id: row.id, title: row.title, kind: row.kind as TrackKind, url: row.url, youtubeId: row.youtubeId, durationSec: row.durationSec, sortOrder: row.sortOrder, createdAt: row.createdAt.toISOString() };
}

export async function listTracks(campaignId: string): Promise<CampaignTrack[]> {
  return (await prisma.campaignTrack.findMany({ where: { campaignId }, orderBy: ORDER })).map(toCampaignTrack);
}

const full = async (campaignId: string) => (await prisma.campaignTrack.count({ where: { campaignId } })) >= MAX_TRACKS_PER_CAMPAIGN;

export async function getTracksHandler(campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    return NextResponse.json(await listTracks(campaignId));
  } catch (error) {
    return handleApiError(error, { action: "list tracks" });
  }
}

export async function issueUploadTicketHandler(req: Request, campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(trackUploadRequestSchema, req);

    if (body instanceof NextResponse) return body;

    const file = validateTrackFile({ name: body.name, type: body.contentType, size: body.size });

    if (!file.ok) return errorResponse(file.message, 400);

    if (await full(campaignId)) return errorResponse(API_ERRORS.TRACK_LIMIT, 400);

    const ticket = await createTrackUploadTicket(campaignId, file.format);

    return ticket.ok ? NextResponse.json(ticket.ticket) : errorResponse(ticket.message, 500);
  } catch (error) {
    return handleApiError(error, { action: "issue track upload" });
  }
}

async function fileSource(campaignId: string, body: { path: string; title: string; durationSec?: number }): Promise<TrackSource | { error: string }> {
  if (!trackPathOwnedBy(body.path, campaignId)) return { error: API_ERRORS.TRACK_UPLOAD_MISSING };

  const verified = await verifyUploadedTrack(body.path);

  if (!verified.ok) return { error: verified.message };

  return { kind: "file", title: body.title, url: verified.url, youtubeId: null, durationSec: body.durationSec ?? null };
}

async function youtubeSource(body: { url: string; title?: string }): Promise<TrackSource | { error: string }> {
  const youtubeId = parseYoutubeId(body.url);

  if (!youtubeId) return { error: API_ERRORS.YOUTUBE_URL_INVALID };

  const title = body.title ?? (await fetchYoutubeTitle(youtubeId)) ?? `YouTube ${youtubeId}`;

  return { kind: "youtube", title, url: null, youtubeId, durationSec: null };
}

export async function createTrackHandler(req: Request, campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(createTrackSchema, req);

    if (body instanceof NextResponse) return body;

    if (await full(campaignId)) return errorResponse(API_ERRORS.TRACK_LIMIT, 400);

    const source = body.kind === "file" ? await fileSource(campaignId, body) : await youtubeSource(body);

    if ("error" in source) return errorResponse(source.error, 400);

    const last = await prisma.campaignTrack.aggregate({ where: { campaignId }, _max: { sortOrder: true } });

    const row = await prisma.campaignTrack.create({ data: { campaignId, ...source, sortOrder: (last._max.sortOrder ?? -1) + 1 } });

    return NextResponse.json(toCampaignTrack(row), { status: 201 });
  } catch (error) {
    return handleApiError(error, { action: "create track" });
  }
}

async function ownedTrack(campaignId: string, trackId: string) {
  return loadOwned(prisma.campaignTrack.findUnique({ where: { id: trackId } }), campaignId, API_ERRORS.TRACK_NOT_FOUND);
}

export async function renameTrackHandler(req: Request, campaignId: string, trackId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(updateTrackSchema, req);

    if (body instanceof NextResponse) return body;

    const track = await ownedTrack(campaignId, trackId);

    if (track instanceof NextResponse) return track;

    return NextResponse.json(toCampaignTrack(await prisma.campaignTrack.update({ where: { id: trackId }, data: { title: body.title } })));
  } catch (error) {
    return handleApiError(error, { action: "rename track" });
  }
}

export async function deleteTrackHandler(campaignId: string, trackId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const track = await ownedTrack(campaignId, trackId);

    if (track instanceof NextResponse) return track;

    await prisma.campaignTrack.delete({ where: { id: trackId } });

    const { url } = track;

    if (track.kind === "file" && url) after(() => removeTrackFile(url));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, { action: "delete track" });
  }
}

export async function reorderTracksHandler(req: Request, campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(reorderTracksSchema, req);

    if (body instanceof NextResponse) return body;

    const known = new Set((await prisma.campaignTrack.findMany({ where: { campaignId }, select: { id: true } })).map((r) => r.id));

    const exact = body.ids.length === known.size && new Set(body.ids).size === body.ids.length && body.ids.every((id) => known.has(id));

    if (!exact) return errorResponse(API_ERRORS.TRACK_ORDER_MISMATCH, 400);

    await prisma.$transaction(body.ids.map((id, sortOrder) => prisma.campaignTrack.update({ where: { id }, data: { sortOrder } })));

    return NextResponse.json(await listTracks(campaignId));
  } catch (error) {
    return handleApiError(error, { action: "reorder tracks" });
  }
}
