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
import { listTracks, toCampaignTrack } from "@/lib/utils/audio/track-store";
import { parseYoutubeId } from "@/lib/utils/audio/youtube-id";
import { fetchYoutubeTitle } from "@/lib/utils/audio/youtube-oembed";
import type { Result } from "@/types/common";

type TrackSource = Pick<TrackRow, "kind" | "title" | "url" | "youtubeId" | "durationSec">;

const isLibraryFull = async (campaignId: string) => (await prisma.campaignTrack.count({ where: { campaignId } })) >= MAX_TRACKS_PER_CAMPAIGN;

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

    if (await isLibraryFull(campaignId)) return errorResponse(API_ERRORS.TRACK_LIMIT, 400);

    const ticket = await createTrackUploadTicket(campaignId, file.value);

    return ticket.ok ? NextResponse.json(ticket.value) : errorResponse(ticket.message, 500);
  } catch (error) {
    return handleApiError(error, { action: "issue track upload" });
  }
}

async function fileSource(campaignId: string, body: { path: string; title: string; durationSec?: number }): Promise<Result<TrackSource>> {
  if (!trackPathOwnedBy(body.path, campaignId)) return { ok: false, message: API_ERRORS.TRACK_UPLOAD_MISSING };

  const verified = await verifyUploadedTrack(body.path);

  if (!verified.ok) return verified;

  // спільний обʼєкт у двох рядках: видалення одного стерло б файл іншого
  if (await prisma.campaignTrack.findFirst({ where: { campaignId, url: verified.value }, select: { id: true } })) return { ok: false, message: API_ERRORS.TRACK_DUPLICATE };

  return { ok: true, value: { kind: "file", title: body.title, url: verified.value, youtubeId: null, durationSec: body.durationSec ?? null } };
}

async function youtubeSource(body: { url: string; title?: string }): Promise<Result<TrackSource>> {
  const youtubeId = parseYoutubeId(body.url);

  if (!youtubeId) return { ok: false, message: API_ERRORS.YOUTUBE_URL_INVALID };

  const title = body.title ?? (await fetchYoutubeTitle(youtubeId)) ?? `YouTube ${youtubeId}`;

  return { ok: true, value: { kind: "youtube", title, url: null, youtubeId, durationSec: null } };
}

export async function createTrackHandler(req: Request, campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(createTrackSchema, req);

    if (body instanceof NextResponse) return body;

    if (await isLibraryFull(campaignId)) return errorResponse(API_ERRORS.TRACK_LIMIT, 400);

    const source = body.kind === "file" ? await fileSource(campaignId, body) : await youtubeSource(body);

    if (!source.ok) return errorResponse(source.message, 400);

    const last = await prisma.campaignTrack.aggregate({ where: { campaignId }, _max: { sortOrder: true } });

    const row = await prisma.campaignTrack.create({ data: { campaignId, ...source.value, sortOrder: (last._max.sortOrder ?? -1) + 1 } });

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
