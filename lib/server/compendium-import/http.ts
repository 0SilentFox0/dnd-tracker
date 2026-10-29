import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchImportImage } from "./media/fetch-image";
import { prismaMediaRepository } from "./media/repository";
import { processMediaBatch } from "./media/service";
import { COMPENDIUM_LIMITS, CompendiumError } from "./parse";
import { importTargetOptions, mediaPresentation, previewPresentation } from "./presentation";
import { prismaImportRepository } from "./repository";
import { type CompendiumReport, confirmImport, previewImport } from "./service";
import { type ImportIssue, translateCompendiumIssue, translateCompendiumReport } from "./types";

import { prisma } from "@/lib/db";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { getTranslator } from "@/lib/i18n/translator";
import { storeCompendiumImage } from "@/lib/supabase/compendium-media-storage";
import { resolveActor } from "@/lib/utils/api/actor";
import { privateJson } from "@/lib/utils/api/api-response";
import { checkRateLimit, rateLimitResponse } from "@/lib/utils/api/rate-limit";
import { isSameOriginRequest } from "@/lib/utils/api/same-origin";
import { isRecord } from "@/lib/utils/common/is-record";

const envelope = z.strictObject({ input: z.unknown(), token: z.string().max(4096).optional(), idempotencyKey: z.string().max(100).optional(), rightsConfirmed: z.boolean().optional() });

const mediaEnvelope = z.strictObject({ runId: z.string().min(1).max(100), retryFailed: z.boolean().optional() });

const MEDIA_BODY_BYTES = 4096;

async function boundedBody<S extends z.ZodType = typeof envelope>(req: Request, schema: S = envelope as unknown as S, limit: number = COMPENDIUM_LIMITS.requestBytes): Promise<z.infer<S>> {
  if (Number(req.headers.get("content-length")) > limit) throw new CompendiumError("REQUEST_SIZE");

  const reader = req.body?.getReader();

  if (!reader) throw new CompendiumError("INVALID_INPUT");

  const decoder = new TextDecoder("utf-8", { fatal: true });

  let bytes = 0, body = "";

  try {
    for (;;) {
      const { value, done } = await reader.read();

      if (done) break;

      bytes += value.byteLength;

      if (bytes > limit) { await reader.cancel(); throw new CompendiumError("REQUEST_SIZE"); }

      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();

    return schema.parse(JSON.parse(body));
  } catch (error) {
    if (error instanceof CompendiumError) throw error;

    throw new CompendiumError("INVALID_INPUT");
  } finally { reader.releaseLock(); }
}

function statusOf(code: string) {
  if (code === "FORBIDDEN") return 403;

  if (code === "RUN_NOT_FOUND") return 404;

  if (/PREVIEW_|IDEMPOTENCY_CONFLICT/.test(code)) return code === "PREVIEW_SECRET_REQUIRED" ? 503 : 409;

  if (/SIZE|LIMIT|DEPTH|NODES|TIMEOUT/.test(code)) return 413;

  return 422;
}

export function compendiumRoute(mode: "preview" | "confirm" | "media" | "reports" | "entries" | "options") {
  return async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await ctx.params;

      const mutation = mode === "preview" || mode === "confirm" || mode === "media";

      if (mutation && !isSameOriginRequest(req)) return privateJson({ code: "FORBIDDEN" }, 403);

      const actor = await resolveActor(req, id, { access: "dm", scope: "content:write", sessionOnly: true });

      if (actor instanceof NextResponse) return actor;

      if (!actor.isDM || actor.via !== "session") return privateJson({ code: "FORBIDDEN" }, 403);

      await prismaImportRepository.authorize(actor);

      const rate = await checkRateLimit({ userId: actor.userId, scope: `compendium-${mode}`, battleId: id, limit: mode === "media" ? 60 : mutation ? 20 : 120, windowSeconds: 60, memoryFallback: true });

      if (!rate.allowed) return rateLimitResponse(rate);

      if (mode === "options") return privateJson(await importTargetOptions(actor));

      const locale = await getRequestLocale();

      const t = await getTranslator(locale, "compendiumReport");

      const url = new URL(req.url);

      const offset = Math.min(100_000, Math.max(0, Number(url.searchParams.get("offset")) || 0));

      if (mode === "reports") {
        const runId = url.searchParams.get("runId");

        const runs = await prisma.compendiumImportRun.findMany({ where: { campaignId: id, ...(runId ? { id: runId } : {}) }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: Math.floor(offset), take: 21, select: { id: true, createdAt: true, report: true } });

        return privateJson({ runs: runs.slice(0, 20).map(run => runId ? { ...run, report: mediaPresentation(translateCompendiumReport(t, run.report as unknown as CompendiumReport)) } : { id: run.id, createdAt: run.createdAt }), hasMore: runs.length > 20 });
      }

      if (mode === "entries") {
        const kind = url.searchParams.get("kind"), targetId = url.searchParams.get("targetId");

        if (!kind || !targetId || kind.length > 100 || targetId.length > 100) return privateJson({ code: "INVALID_INPUT" }, 422);

        const entries = await prisma.compendiumEntry.findMany({ where: { campaignId: id, kind, localId: targetId }, orderBy: { canonicalKey: "asc" }, skip: Math.floor(offset), take: 51, select: { canonicalKey: true, originalName: true, edition: true, sourceJson: true, attribution: true, notes: true, issues: true, locator: true } });

        return privateJson({ entries: entries.slice(0, 50).map(entry => ({ ...entry, issues: Array.isArray(entry.issues) ? entry.issues.map(item => isRecord(item) ? translateCompendiumIssue(t, item as unknown as ImportIssue) : item) : entry.issues })), hasMore: entries.length > 50 });
      }

      if (mode === "media") {
        const body = await boundedBody(req, mediaEnvelope, MEDIA_BODY_BYTES);

        try {
          return privateJson(await processMediaBatch(actor, body.runId, { repository: prismaMediaRepository, fetchImage: fetchImportImage, store: storeCompendiumImage }, { retryFailed: body.retryFailed }));
        } catch (error) {
          if (error instanceof CompendiumError && error.code === "FORBIDDEN") return privateJson({ code: "RUN_NOT_FOUND" }, 404);

          throw error;
        }
      }

      const secret = process.env.COMPENDIUM_PREVIEW_SECRET ?? "";

      if (secret.length < 32) return privateJson({ code: "PREVIEW_SECRET_REQUIRED" }, 503);

      const body = await boundedBody(req);

      // Domain service validates input; never log request bodies, parser errors or DB exceptions here.
      const input = body.input as Parameters<typeof previewImport>[1];

      if (mode === "preview") {
        const preview = await previewImport(actor, input, secret, prismaImportRepository, locale);

        return privateJson({ ...preview, report: translateCompendiumReport(t, preview.report), ...previewPresentation(input, preview.report.nextActions) });
      }

      if (!body.rightsConfirmed || !body.token || !body.idempotencyKey) return privateJson({ code: "CONFIRM_REQUIRED" }, 422);

      return privateJson(mediaPresentation(translateCompendiumReport(t, await confirmImport(actor, input, body.token, body.idempotencyKey, secret, prismaImportRepository, locale))));
    } catch (error) {
      if (error instanceof CompendiumError) return privateJson({ code: error.code, ...(error.code === "NOTES_SIZE" && error.details && { details: error.details }) }, statusOf(error.code));

      // Existing domain guards use ContentError. Return only a fixed code, never their payload.
      if (error && typeof error === "object" && "status" in error && error.status === 409) return privateJson({ code: "CONTENT_CONFLICT" }, 409);

      return privateJson({ code: "IMPORT_FAILED" }, 500);
    }
  };
}
