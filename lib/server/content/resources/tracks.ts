import { after } from "next/server";
import type { CampaignTrack as TrackRow } from "@prisma/client";
import type { z } from "zod";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { createTrackSchema, createYoutubeTrackSchema, updateTrackSchema } from "@/lib/schemas/music";
import { isLibraryFull, listTracks, toCampaignTrack } from "@/lib/server/audio/track-store";
import { defineResource } from "@/lib/server/content/define-resource";
import { ContentError } from "@/lib/server/content/errors";
import { removeTrackFile, trackObjectPath, trackPathOwnedBy, verifyUploadedTrack } from "@/lib/supabase/battle-music-storage";
import { parseYoutubeId } from "@/lib/utils/audio/youtube-id";
import { fetchYoutubeTitle } from "@/lib/utils/audio/youtube-oembed";
import type { Result } from "@/types/common";

type TrackSource = Pick<TrackRow, "kind" | "title" | "url" | "youtubeId" | "durationSec">;

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

const unwrap = <T>(result: Result<T>): T => {
  if (!result.ok) throw new ContentError(result.message, 400);

  return result.value;
};

export const tracksResource = defineResource<TrackRow, z.infer<typeof createTrackSchema>, z.infer<typeof updateTrackSchema>>({
  kind: "tracks",
  idParam: "trackId",
  label: "Музика бою",
  description: "Треки плеєра бою. Через API — лише YouTube за посиланням; файли завантажуються в UI.",
  path: "/tracks",
  schemas: { create: createTrackSchema, update: updateTrackSchema, apiCreate: createYoutubeTrackSchema },
  access: { list: "dm", item: "dm" },
  invalidates: [],
  notFound: API_ERRORS.TRACK_NOT_FOUND,
  list: (actor) => listTracks(actor.campaignId),
  find: (actor, id) => prisma.campaignTrack.findFirst({ where: { id, campaignId: actor.campaignId } }),
  toItem: toCampaignTrack,
  async create(actor, body) {
    if (body.kind === "file" && actor.via === "token") throw new ContentError(API_ERRORS.TRACK_FILE_SESSION_ONLY, 403);

    if (await isLibraryFull(actor.campaignId)) throw new ContentError(API_ERRORS.TRACK_LIMIT, 400);

    const source = unwrap(body.kind === "file" ? await fileSource(actor.campaignId, body) : await youtubeSource(body));

    const last = await prisma.campaignTrack.aggregate({ where: { campaignId: actor.campaignId }, _max: { sortOrder: true } });

    return prisma.campaignTrack.create({ data: { campaignId: actor.campaignId, ...source, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
  },
  async update(_actor, existing, body) {
    if (body.url !== undefined && existing.kind !== "youtube") throw new ContentError(API_ERRORS.TRACK_URL_LOCKED, 400);

    const data = { title: body.title, durationSec: body.durationSec, youtubeId: body.url === undefined ? undefined : parseYoutubeId(body.url) };

    return prisma.campaignTrack.update({ where: { id: existing.id }, data });
  },
  async remove(actor, existing) {
    await prisma.campaignTrack.deleteMany({ where: { id: existing.id, campaignId: actor.campaignId } });

    const { url } = existing;

    if (existing.kind === "file" && url) {
      const path = trackObjectPath(url);

      if (path && trackPathOwnedBy(path, actor.campaignId)) after(() => removeTrackFile(url));
    }
  },
});
