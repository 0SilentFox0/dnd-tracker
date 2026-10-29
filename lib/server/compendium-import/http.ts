import { NextResponse } from "next/server";
import { z } from "zod";

import { COMPENDIUM_LIMITS, CompendiumError } from "./parse";
import { importTargetOptions, previewPresentation } from "./presentation";
import { prismaImportRepository } from "./repository";
import { confirmImport, previewImport } from "./service";

import { prisma } from "@/lib/db";
import { resolveActor } from "@/lib/utils/api/actor";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import { checkRateLimit, rateLimitResponse } from "@/lib/utils/api/rate-limit";
import { isSameOriginRequest } from "@/lib/utils/api/same-origin";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: PRIVATE_NO_STORE_HEADERS });

const envelope = z.strictObject({ input: z.unknown(), token: z.string().max(4096).optional(), idempotencyKey: z.string().max(100).optional(), rightsConfirmed: z.boolean().optional() });

async function boundedBody(req: Request) {
  if (Number(req.headers.get("content-length")) > COMPENDIUM_LIMITS.requestBytes) throw new CompendiumError("REQUEST_SIZE");

  const reader = req.body?.getReader();

  if (!reader) throw new CompendiumError("INVALID_INPUT");

  const decoder = new TextDecoder("utf-8", { fatal: true });

  let bytes = 0, body = "";

  try {
    for (;;) {
      const { value, done } = await reader.read();

      if (done) break;

      bytes += value.byteLength;

      if (bytes > COMPENDIUM_LIMITS.requestBytes) { await reader.cancel(); throw new CompendiumError("REQUEST_SIZE"); }

      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();

    return envelope.parse(JSON.parse(body));
  } catch (error) {
    if (error instanceof CompendiumError) throw error;

    throw new CompendiumError("INVALID_INPUT");
  } finally { reader.releaseLock(); }
}

function statusOf(code: string) {
  if (code === "FORBIDDEN") return 403;

  if (/PREVIEW_|IDEMPOTENCY_CONFLICT/.test(code)) return code === "PREVIEW_SECRET_REQUIRED" ? 503 : 409;

  if (/SIZE|LIMIT|DEPTH|NODES|TIMEOUT/.test(code)) return 413;

  return 422;
}

export function compendiumRoute(mode: "preview" | "confirm" | "reports" | "entries" | "options") {
  return async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await ctx.params;

      const mutation = mode === "preview" || mode === "confirm";

      if (mutation && !isSameOriginRequest(req)) return json({ code: "FORBIDDEN" }, 403);

      const actor = await resolveActor(req, id, { access: "dm", scope: "content:write", sessionOnly: true });

      if (actor instanceof NextResponse) return actor;

      if (!actor.isDM || actor.via !== "session") return json({ code: "FORBIDDEN" }, 403);

      await prismaImportRepository.authorize(actor);

      const rate = await checkRateLimit({ userId: actor.userId, scope: `compendium-${mode}`, battleId: id, limit: mutation ? 20 : 120, windowSeconds: 60, memoryFallback: true });

      if (!rate.allowed) return rateLimitResponse(rate);

      if (mode === "options") return json(await importTargetOptions(actor));

      const url = new URL(req.url);

      const offset = Math.min(100_000, Math.max(0, Number(url.searchParams.get("offset")) || 0));

      if (mode === "reports") {
        const runId = url.searchParams.get("runId");

        const runs = await prisma.compendiumImportRun.findMany({ where: { campaignId: id, ...(runId ? { id: runId } : {}) }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: Math.floor(offset), take: 21, select: { id: true, createdAt: true, report: true } });

        return json({ runs: runs.slice(0, 20).map(run => runId ? run : { id: run.id, createdAt: run.createdAt }), hasMore: runs.length > 20 });
      }

      if (mode === "entries") {
        const kind = url.searchParams.get("kind"), targetId = url.searchParams.get("targetId");

        if (!kind || !targetId || kind.length > 100 || targetId.length > 100) return json({ code: "INVALID_INPUT" }, 422);

        const entries = await prisma.compendiumEntry.findMany({ where: { campaignId: id, kind, localId: targetId }, orderBy: { canonicalKey: "asc" }, skip: Math.floor(offset), take: 51, select: { canonicalKey: true, originalName: true, edition: true, sourceJson: true, attribution: true, notes: true, issues: true, locator: true } });

        return json({ entries: entries.slice(0, 50), hasMore: entries.length > 50 });
      }

      const secret = process.env.COMPENDIUM_PREVIEW_SECRET ?? "";

      if (secret.length < 32) return json({ code: "PREVIEW_SECRET_REQUIRED" }, 503);

      const body = await boundedBody(req);

      // Domain service validates input; never log request bodies, parser errors or DB exceptions here.
      const input = body.input as Parameters<typeof previewImport>[1];

      if (mode === "preview") {
        const preview = await previewImport(actor, input, secret, prismaImportRepository);

        return json({ ...preview, ...previewPresentation(input, preview.report.nextActions) });
      }

      if (!body.rightsConfirmed || !body.token || !body.idempotencyKey) return json({ code: "CONFIRM_REQUIRED" }, 422);

      return json(await confirmImport(actor, input, body.token, body.idempotencyKey, secret, prismaImportRepository));
    } catch (error) {
      if (error instanceof CompendiumError) return json({ code: error.code, ...(error.code === "NOTES_SIZE" && error.details && { details: error.details }) }, statusOf(error.code));

      // Existing domain guards use ContentError. Return only a fixed code, never their payload.
      if (error && typeof error === "object" && "status" in error && error.status === 409) return json({ code: "CONTENT_CONFLICT" }, 409);

      return json({ code: "IMPORT_FAILED" }, 500);
    }
  };
}
