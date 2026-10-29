import type { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { bump } from "./queue";
import type { MediaClaimOptions, MediaRepository, MediaResult } from "./service";
import { emptyMediaState, MEDIA_LIMITS, type MediaItem, type MediaQueueState, type MediaReason, type MediaTarget } from "./types";

import "server-only";
import { invalidateAllReference } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import { jsonContentInput } from "@/lib/server/assistant/json";
import type { AnyContentResource } from "@/lib/server/content/define-resource";
import { CONTENT_RESOURCES } from "@/lib/server/content/resources";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { afterContentCommit } from "@/lib/server/content/write-context";
import { contentWrite } from "@/lib/server/scenario/content-write";
import { snapshotIfDue } from "@/lib/server/scenario/versions";
import type { Actor } from "@/lib/utils/api/actor";
import { asRecord } from "@/lib/utils/common/json";
import { fillImageSources } from "@/lib/utils/scenario/fill-image-sources";
import type { ScenarioContent } from "@/types/scenario";

type Report = Record<string, unknown> & { media?: MediaQueueState & Record<string, unknown> };

const mediaOf = (report: Report): MediaQueueState => report.media ?? emptyMediaState();

async function lockRun(tx: Prisma.TransactionClient, actor: Actor, runId: string) {
  const rows = await tx.$queryRaw<Array<{ report: Report }>>`SELECT report FROM compendium_import_runs WHERE id = ${runId} AND "campaignId" = ${actor.campaignId} FOR UPDATE`;

  return rows.length === 1 ? rows[0].report : null;
}

const saveReport = (tx: Prisma.TransactionClient, runId: string, report: Report, media: MediaQueueState) =>
  tx.compendiumImportRun.update({ where: { id: runId }, data: { report: jsonContentInput({ ...report, media: { ...report.media, ...media } }) } });

const skip = (state: MediaQueueState, target: MediaTarget, reason: MediaReason) => {
  target.status = "skipped";
  target.reason = reason;
  bump(state.skipped, reason);
};

async function applyField(actor: Actor, target: MediaTarget, storedUrl: string, state: MediaQueueState) {
  const resource = target.kind === "scenarioPages" ? undefined : CONTENT_RESOURCES[target.kind] as AnyContentResource;

  const row = resource && target.field ? asRecord(await resource.find(actor, target.localId, "write")) : undefined;

  if (!resource || !target.field || !row || row.id === undefined) return skip(state, target, "MEDIA_TARGET_GONE");

  const current = row[target.field];

  if (current && current !== storedUrl) return skip(state, target, "MEDIA_TARGET_CUSTOMIZED");

  try {
    if (current !== storedUrl) await resource.update(actor, row as never, resource.schemas.update.parse({ [target.field]: storedUrl }));
  } catch (error) {
    if (!(error instanceof ZodError)) throw error;

    return skip(state, target, "MEDIA_TARGET_GONE");
  }

  target.status = "saved";
}

async function applyPages(actor: Actor, tx: Prisma.TransactionClient, saved: Array<{ item: MediaItem; storedUrl: string }>, state: MediaQueueState) {
  const pages = new Map<string, Array<{ target: MediaTarget; storedUrl: string }>>();

  for (const { item, storedUrl } of saved) for (const target of item.targets) {
    if (!target.mediaId || target.status) continue;

    pages.set(target.localId, [...pages.get(target.localId) ?? [], { target, storedUrl }]);
  }

  for (const [pageId, entries] of pages) {
    const page = await tx.scenarioPage.findFirst({ where: { campaignId: actor.campaignId, id: pageId } });

    if (!page) {
      for (const { target } of entries) skip(state, target, "MEDIA_TARGET_GONE");

      continue;
    }

    const urls = new Map(entries.map(({ target, storedUrl }) => [target.mediaId!, storedUrl]));

    const filled = fillImageSources(page.content as unknown as ScenarioContent, urls);

    for (const { target } of entries) {
      if (filled.found.has(target.mediaId!)) target.status = "saved";
      else skip(state, target, "MEDIA_TARGET_GONE");
    }

    if (!filled.changed) continue;

    await snapshotIfDue(tx, page.id, actor.userId);
    await tx.scenarioPage.update({ where: { id: page.id }, data: { ...contentWrite(page.title, filled.content), version: { increment: 1 } } });
  }
}

export const prismaMediaRepository: MediaRepository = {
  async claim(actor: Actor, runId: string, opts: MediaClaimOptions) {
    return prisma.$transaction(async (tx) => {
      const report = await lockRun(tx, actor, runId);

      if (!report) return null;

      const media = mediaOf(report);

      if (opts.retryFailed) {
        for (const item of media.items) if (item.status === "failed" && item.retryable && item.attempts < MEDIA_LIMITS.maxAttempts) {
          item.status = "pending";
          delete item.reason;
          delete item.params;
          delete item.retryable;
        }
      }

      const items = media.items.filter((item) => item.status === "pending" && (item.leaseUntil ?? 0) < opts.now).slice(0, opts.max);

      for (const item of items) {
        item.leaseUntil = opts.now + opts.leaseMs;
        item.attempts += 1;
      }

      const known = new Map<string, string>();

      if (items.length) {
        const wanted = new Set(items.map((i) => i.url));

        const runs = await tx.compendiumImportRun.findMany({ where: { campaignId: actor.campaignId }, orderBy: { createdAt: "desc" }, take: MEDIA_LIMITS.knownRuns, select: { report: true } });

        for (const run of runs) for (const item of mediaOf(run.report as unknown as Report).items) {
          if (item.status === "saved" && item.storedUrl && wanted.has(item.url)) known.set(item.url, item.storedUrl);
        }
      }

      if (items.length || opts.retryFailed) await saveReport(tx, runId, report, media);

      return { items: structuredClone(items), known };
    });
  },

  async release(actor, runId, ids) {
    await prisma.$transaction(async (tx) => {
      const report = await lockRun(tx, actor, runId);

      if (!report) return;

      const media = mediaOf(report);

      let changed = false;

      for (const item of media.items) if (ids.includes(item.id) && item.status === "pending") {
        delete item.leaseUntil;
        item.attempts = Math.max(0, item.attempts - 1);
        changed = true;
      }

      if (changed) await saveReport(tx, runId, report, media);
    });
  },

  async apply(actor, runId, results: MediaResult[]) {
    return withCampaignContentWrite(actor.campaignId, async (tx) => {
      const report = await lockRun(tx, actor, runId);

      if (!report) return emptyMediaState();

      const media = mediaOf(report);

      if (!results.length) return media;

      const saved: Array<{ item: MediaItem; storedUrl: string }> = [];

      const byId = new Map(media.items.map((i) => [i.id, i]));

      for (const result of results) {
        const item = byId.get(result.id);

        if (!item || item.status !== "pending") continue;

        delete item.leaseUntil;

        if (!result.ok) {
          item.status = "failed";
          item.reason = result.reason;
          item.retryable = result.retryable && item.attempts < MEDIA_LIMITS.maxAttempts;

          if (result.params) item.params = result.params;

          continue;
        }

        item.status = "saved";
        item.storedUrl = result.storedUrl;
        saved.push({ item, storedUrl: result.storedUrl });

        for (const target of item.targets) if (target.field && !target.status) await applyField(actor, target, result.storedUrl, media);
      }

      await applyPages(actor, tx, saved, media);
      await saveReport(tx, runId, report, media);
      afterContentCommit(() => invalidateAllReference(actor.campaignId));

      return media;
    });
  },
};
